# apollo-cache-midleware

Global apollo graphql query caching middleware for express

`npm install -s apollo-cache-midlleware`

To use this middleware with apollo, just call it on the same endpoint apollo is listening for graphql queries, a bit like this :

```
const cache = require("apollo-cache-middleware")

const options = {
    memory : {
        stdTTL : 60 // default TTL to a minute
    }
}

const endPoint = "/graphql"

app.use(endPoint, cache(options))

const server = new ApolloServer({
  path : endPoint
});

server.applyMiddleware({ app });
```

Options possibles are :

| Argument | Type          | Details                                                                                                                                            |
| -------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| memory   | Bool / Object | Set the cache to memory. If an object, will be passed to the node-cache constructor                                                                |
| redis    | Bool / Object | Set the cache to redis. If an object, will be passed to the redis client constructor, plus one more argument (stdTTL) to set standard time to live |
| log      | Bool          | Activate logs                                                                                                                                      |
