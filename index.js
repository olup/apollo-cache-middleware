// A cache middle ware for graphql queries

const NodeCache = require("node-cache");
const sha256 = require("hash.js/lib/hash/sha/256");
const redis = "redis";

// logger
let log = () => {};

const createStore = userOptions => {
  const defaultOptions = {
    memory: true,
    log: false
  };
  const options = { ...defaultOptions, ...userOptions };

  if (options.memory) {
    log("Cache initiated with NODE-CACHE");
    const client = new NodeCache(options.memory);
    cache = {
      get: key =>
        new Promise((res, rej) =>
          client.get(key, (err, value) => {
            if (err) return rej(value);
            return res(value);
          })
        ),
      set: (key, value, ttl) =>
        new Promise((res, rej) =>
          client.set(key, value, ttl, err => {
            if (err) return rej(err);
            return res();
          })
        )
    };
  } else if (options.redis) {
    log("Cache initiated with REDIS");
    const stdTTL =
      typeof options.redis === "object" ? options.redis.stdTTL : undefined;
    const client = redis.createClient(options.redis);
    cache = {
      get: key =>
        new Promise((res, rej) =>
          client.get(key, (err, value) => {
            if (err) return rej(value);
            return res(value);
          })
        ),
      set: (key, value, ttl) =>
        new Promise((res, rej) =>
          client.set(key, value, "EX", ttl || stdTTL, err => {
            if (err) return rej(err);
            return res();
          })
        )
    };
  }
  return cache;
};

const hashPostBody = query => {
  // trim query
  const q = query.replace(/\s+/g, "");
  const key = sha256()
    .update(q)
    .digest("hex");
  return key;
};

// Main function
module.exports = options => {
  // set logger
  if (options.log)
    log = (...datas) => {
      console.log(...datas);
    };

  // create cache according to options
  const store = createStore(options);

  // return express middleWare to be used
  return async (req, res, next) => {
    // if Cache-control header is set to no-cache, just ignore the middleware
    if (req.get("Cache-Control") === "no-cache") return next();

    const body = req.body;

    // If the request is not POST and is not a graphql query, ignore it
    const { method } = req;
    if (method !== "POST" || !body.query) return next();

    // create a key from the complete body of the graphql query
    const key = hashPostBody(JSON.stringify(body));

    // get value from store
    const value = await store.get(queryKey);

    if (value) {
      log("Request served from cache");

      // it was in store, just send it back
      const { payload } = JSON.parse(value);

      res.setHeader("X-Cache", "HIT");
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Length",
        Buffer.byteLength(value, "utf8").toString()
      );
      res.write(value);
      return res.end();
    } else {
      // If not, change res.write (used by apollo) to store response before sending data.
      res._write = res.write;
      res.write = payload => {
        // payload is passed by apollo.

        // get TTL from the Cache-control request header, if any
        let TTL = parseInt(req.get("Cache-Control"), 10);
        if (isNaN(TTL)) TTL = undefined;

        store.set(key, JSON.stringify({ payload }), TTL);

        log("Request cached");

        res._write(content);
      };
    }
  };
};
