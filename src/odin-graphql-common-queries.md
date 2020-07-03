### Create a new account
mutation RegisterMutation {
  registerPerson(
    input: {
      firstName: "bob"
      lastName: "bobberson"
      email: "bob@bob.com"
      password: "bob@bob.com"
    }
  ) {
    person {
      nodeId      
    }
  }
}

### Login
mutation LoginMutation {
  authenticate(input: { email: "bob@bob.com", password: "bob@bob.com" }) {
    jwtToken
  }
}

### Note, in GraphiQL, be sure to add the header, e.g.
{ 
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYXBwX2F1dGhlbnRpY2F0ZWQiLCJwZXJzb25faWQiOjEsImV4cCI6MTU5MzkwODQyMCwiaWF0IjoxNTkzNzM1NjIwLCJhdWQiOiJwb3N0Z3JhcGhpbGUiLCJpc3MiOiJwb3N0Z3JhcGhpbGUifQ.OjgYjjPUViMxp7sg22hNqdw4VGAYPN6zWCto91wj78c"
}

### Check current user:
query MeQuery {
  currentPerson {
    id
    firstName
    lastName
    fullName
  }
}

### Create a post
mutation CreatePostMutation {
  createPost(
    input: { post: { headline: "hello", body: "lorem ipsum", authorId: 1 } }
  ) {
    postEdge {
      node {
        nodeId
        headline
        body
      }
    }
  }
}

### If a user tries to provide not their own author ID, they get
{
  "errors": [
    {
      "errcode": "42501",
      "extensions": {
        "exception": {
          "errcode": "42501"
        }
      },
      "message": "new row violates row-level security policy for table \"post\"",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "createPost"
      ],
      "stack": "error: new row violates row-level security policy for table \"post\"\n    at Parser.parseErrorMessage (/Users/paws/projects/odin-server/node_modules/pg-protocol/src/parser.ts:325:11)\n    at Parser.handlePacket (/Users/paws/projects/odin-server/node_modules/pg-protocol/src/parser.ts:154:21)\n    at Parser.parse (/Users/paws/projects/odin-server/node_modules/pg-protocol/src/parser.ts:106:30)\n    at Socket.<anonymous> (/Users/paws/projects/odin-server/node_modules/pg-protocol/src/index.ts:7:48)\n    at Socket.emit (events.js:315:20)\n    at addChunk (_stream_readable.js:302:12)\n    at readableAddChunk (_stream_readable.js:278:9)\n    at Socket.Readable.push (_stream_readable.js:217:10)\n    at TCP.onStreamRead (internal/stream_base_commons.js:186:23)"
    }
  ],
  "data": {
    "createPost": null
  },
  "explain": [
    {
      "query": "with __local_0__ as (insert into \"app_public\".\"post\" (\"headline\", \"body\", \"author_id\") values($1, $2, $3) returning *) select ((case when __local_0__ is null then null else __local_0__ end))::text from __local_0__",
      "plan": "CTE Scan on __local_0__  (cost=0.01..0.04 rows=1 width=32)\n  CTE __local_0__\n    ->  Insert on post  (cost=0.00..0.01 rows=1 width=72)\n          ->  Result  (cost=0.00..0.01 rows=1 width=72)"
    }
  ]
}


### View Foods
query FoodsQuery {
  foods(first: 10) {
    edges {
      node {
        nodeId
        name
        intentToGoBack
        address
        cuisine
      }
    }
  }
}
