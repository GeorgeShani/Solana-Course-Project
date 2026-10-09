/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/relay.json`.
 */
export type Relay = {
  "address": "Dzm5tgMCdhJZfXeHYuALst4hvZYiCebfyKf1ctx6WBF6",
  "metadata": {
    "name": "relay",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Relay: append-only trade-plan commitments and verified follow receipts"
  },
  "instructions": [
    {
      "name": "closePlan",
      "discriminator": [
        45,
        137,
        184,
        220,
        162,
        253,
        161,
        8
      ],
      "accounts": [
        {
          "name": "creator",
          "signer": true,
          "relations": [
            "plan"
          ]
        },
        {
          "name": "plan",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "createPlan",
      "discriminator": [
        77,
        43,
        141,
        254,
        212,
        118,
        41,
        186
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "plan",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "planId"
              }
            ]
          }
        },
        {
          "name": "version",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  114,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "plan"
              },
              {
                "kind": "const",
                "value": [
                  1,
                  0
                ]
              }
            ]
          }
        },
        {
          "name": "baseMint",
          "docs": [
            "Must be owned by the classic SPL Token program (Token-2022 mints are rejected by type)."
          ]
        },
        {
          "name": "quoteMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "planId",
          "type": "u64"
        },
        {
          "name": "entryLow",
          "type": "u64"
        },
        {
          "name": "entryHigh",
          "type": "u64"
        },
        {
          "name": "expiresAt",
          "type": "i64"
        },
        {
          "name": "contentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "revisePlan",
      "discriminator": [
        45,
        156,
        119,
        120,
        160,
        78,
        85,
        71
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "plan"
          ]
        },
        {
          "name": "plan",
          "writable": true
        },
        {
          "name": "prevVersion",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  101,
                  114,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "plan"
              },
              {
                "kind": "account",
                "path": "plan.latestVersion",
                "account": "plan"
              }
            ]
          }
        },
        {
          "name": "newVersion",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "entryLow",
          "type": "u64"
        },
        {
          "name": "entryHigh",
          "type": "u64"
        },
        {
          "name": "expiresAt",
          "type": "i64"
        },
        {
          "name": "contentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "plan",
      "discriminator": [
        161,
        231,
        251,
        119,
        2,
        12,
        162,
        2
      ]
    },
    {
      "name": "planVersion",
      "discriminator": [
        28,
        234,
        239,
        110,
        19,
        210,
        3,
        13
      ]
    }
  ],
  "events": [
    {
      "name": "planClosedEvent",
      "discriminator": [
        6,
        115,
        16,
        243,
        108,
        123,
        11,
        42
      ]
    },
    {
      "name": "planCommitted",
      "discriminator": [
        83,
        238,
        231,
        240,
        7,
        247,
        206,
        185
      ]
    },
    {
      "name": "planRevised",
      "discriminator": [
        1,
        109,
        220,
        203,
        113,
        131,
        135,
        108
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "pairNotSupported",
      "msg": "This trading pair is not supported"
    },
    {
      "code": 6001,
      "name": "invalidBounds",
      "msg": "Entry bounds must satisfy 0 < low <= high"
    },
    {
      "code": 6002,
      "name": "invalidWindow",
      "msg": "The entry window must stay open between 1 minute and 7 days"
    },
    {
      "code": 6003,
      "name": "planClosed",
      "msg": "The creator closed this plan"
    },
    {
      "code": 6004,
      "name": "tooManyVersions",
      "msg": "A plan can have at most 16 versions"
    },
    {
      "code": 6005,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "plan",
      "docs": [
        "A creator's trade plan. Holds only what changes rarely; every version's terms live in a",
        "separate immutable `PlanVersion` account. Never closed: it is history."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "planId",
            "type": "u64"
          },
          {
            "name": "baseMint",
            "type": "pubkey"
          },
          {
            "name": "quoteMint",
            "type": "pubkey"
          },
          {
            "name": "baseDecimals",
            "type": "u8"
          },
          {
            "name": "quoteDecimals",
            "type": "u8"
          },
          {
            "name": "latestVersion",
            "type": "u16"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "planStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "planClosedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "planCommitted",
      "docs": [
        "Events are hints for indexers. Logs can be truncated, so indexers must read accounts as truth."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "termsHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "expiresAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "planRevised",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "termsHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "expiresAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "planStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "closed"
          }
        ]
      }
    },
    {
      "name": "planVersion",
      "docs": [
        "One immutable version of a plan. Nothing in this program can write to it after `init`.",
        "Prices are u64 quote atomic units per ONE WHOLE base token. Times are unix seconds."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "plan",
            "type": "pubkey"
          },
          {
            "name": "version",
            "type": "u16"
          },
          {
            "name": "entryLow",
            "type": "u64"
          },
          {
            "name": "entryHigh",
            "type": "u64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "publishedAt",
            "type": "i64"
          },
          {
            "name": "publishedSlot",
            "type": "u64"
          },
          {
            "name": "contentHash",
            "docs": [
              "SHA-256 of the offchain text (rationale, exit thesis, ...). See domain/src/commitment.ts."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "prevTermsHash",
            "docs": [
              "terms_hash of the previous version; all zeros for version 1."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "termsHash",
            "docs": [
              "Hash over all of the above plus the plan, creator and program id (see commitment.rs)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "maxVersions",
      "docs": [
        "Maximum versions per plan (v1 plus 15 revisions)."
      ],
      "type": "u16",
      "value": "16"
    },
    {
      "name": "maxWindowSecs",
      "type": "i64",
      "value": "604800"
    },
    {
      "name": "minWindowSecs",
      "docs": [
        "A plan's entry window must stay open at least this long and at most this long (seconds).",
        "Keep in sync with domain/src/plan-terms.ts."
      ],
      "type": "i64",
      "value": "60"
    },
    {
      "name": "planSeed",
      "type": "bytes",
      "value": "[112, 108, 97, 110]"
    },
    {
      "name": "versionSeed",
      "type": "bytes",
      "value": "[118, 101, 114, 115, 105, 111, 110]"
    }
  ]
};
