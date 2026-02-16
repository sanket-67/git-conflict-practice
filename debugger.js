import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();
let globalMongoose = null;

/** 🛡️ SECURITY: Mask sensitive fields */
const sanitizeBody = (body) => {
  if (!body) return {};
  const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'card', 'cvv'];
  const cleanBody = JSON.parse(JSON.stringify(body));

  const mask = (obj) => {
    for (const key in obj) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        obj[key] = '***** [REDACTED] *****';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        mask(obj[key]);
      }
    }
  };
  mask(cleanBody);
  return cleanBody;
};

/** 🔍 ANALYZER: Extract Clean Validation Errors */
const analyzeValidationErrors = (responseBody) => {
  // Check if this is a Mongoose Validation Error
  if (!responseBody || responseBody.name !== 'ValidationError' || !responseBody.errors) {
    return null;
  }

  const report = [];
  
  // Loop through all fields that failed
  for (const field in responseBody.errors) {
    const err = responseBody.errors[field];
    
    report.push({
      field: field,
      providedValue: err.value, // What the user sent
      expectedType: err.kind,   // What Mongoose wanted (e.g., "Number", "required")
      message: err.message      // The error message
    });
  }
  
  return report;
};

/** 🧠 HELPER: Get Schema for Context */
const getSchemaStructure = (collectionName) => {
  if (!globalMongoose) return "Mongoose not attached";
  
  const modelNames = globalMongoose.modelNames();
  const foundModelName = modelNames.find(name => 
    globalMongoose.model(name).collection.name === collectionName
  );

  if (!foundModelName) return "Schema not found";

  // Simplify Schema for display
  const paths = globalMongoose.model(foundModelName).schema.paths;
  const simplified = {};
  for (const key in paths) {
    // Show 'Number', 'String' instead of complex object
    simplified[key] = paths[key].instance; 
  }
  return simplified;
};

/** 🔌 SETUP: Attach to Mongoose */
const attachSpy = (mongooseInstance) => {
  if (globalMongoose) return;
  globalMongoose = mongooseInstance;

  const originalDebug = mongooseInstance.get('debug');
  mongooseInstance.set('debug', (col, method, query, doc) => {
    if (typeof originalDebug === 'function') originalDebug(col, method, query, doc);
    
    const store = storage.getStore();
    if (store) store.collections.add(col);
  });
};

/** 🚀 MIDDLEWARE: The Logger */
const reqTypeCheck = (req, res, next) => {
  const store = { collections: new Set() };
  
  // 1. Hijack res.json to inspect errors before they go to user
  const originalJson = res.json;
  let responseBody = null;

  res.json = function (data) {
    responseBody = data; // Capture the body
    return originalJson.call(this, data);
  };

  storage.run(store, () => {
    res.on('finish', () => {
      // Get accessed collections (if any)
      const collectionList = Array.from(store.collections);
      
      // If no DB call happened (validation failed early), try to guess collection from URL?
      // For now, we only show Schema if a DB connection was attempted.
      const schemasUsed = {};
      collectionList.forEach(col => schemasUsed[col] = getSchemaStructure(col));

      // 🔍 RUN THE MISMATCH DETECTOR
      const mismatchReport = analyzeValidationErrors(responseBody);

      const logData = {
        uri: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        method: req.method,
        status: res.statusCode,
        
        // 1. Show what they sent (Sanitized)
        payload_sent: ['POST', 'PUT', 'PATCH'].includes(req.method) 
          ? sanitizeBody(req.body) 
          : undefined,

        // 2. Show the Error Report (If validation failed)
        validation_errors: mismatchReport ? mismatchReport : "None",

        // 3. Show Schema (If available)
        expected_schema: Object.keys(schemasUsed).length > 0 ? schemasUsed : undefined,
        
        timestamp: new Date().toISOString()
      };

      // Only log if it's an error OR a write operation (keeps logs clean)
      if (res.statusCode >= 400 || ['POST', 'PUT', 'DELETE'].includes(req.method)) {
         console.log(JSON.stringify(logData, null, 2));
      }
    });

    next();
  });
};

export { reqTypeCheck, attachSpy };