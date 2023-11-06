## parseProtobuf

```sql
parseProtobuf(protobuf_expr, message_type, typedefs)
```

### Description

Parses a Protobuf message and converts it to a `JSON` value.

Arguments:

- `protobuf_expr`: A `BYTES` value containing a serialized Protobuf message. For example:
  ```sql
  b'\x08\x01'
  ```
- `message_type`: The name of the protobuf message type. For example:
  ```sql
  'com.example.Main'
  ```
  or simply:
  ```sql
  'Main'
  ```
  The name you specify here is used to look up the message type in the `typedefs` argument. As long as it matches the name in the `typedefs` argument, it can be anything you want.
- `typedefs`: A `JSON` object containing type definitions. For example:
  ```sql
  JSON """
  {
    "message Main": {
      "field1": { "type": "uint32", "id": 1 }
    }
  }
  """
  ```
  If type definition is not found for the requested message name, it falls back to schemaless mode and infers the type from the message itself.

  Do not supply untrusted input to this parameter.

### Return type

`JSON`

### Examples
  
```sql
SELECT parseProtobuf(b'\x08\x01', 'Main', JSON""" {
  "message Main": {
    "field1": { "type": "uint32", "id": 1 }
  }
}
""") AS json_data;

/*--------------*
 | json_data    |
 +--------------+
 | {"field1":1} |
 *--------------*/
```

## Schema format

bqpb's `parseProtobuf` uses a dedicated format for the schema. This is for the following reasons:

- To provide a convenient way for users to specify only the necessary part of the schema.
- To minimize the implementation, making it affordable to copy-paste the code as a temporary UDF.

### Message definition

A message is defined as a top-level key in the form of `"message <message_name>"`.

The message name can be an arbitrary text as long as it matches the other parts of the definitions, but it is recommended to use the fully qualified name or the last segment of it.

If the message can be wrapped in the `google.protobuf.Any` type, the name should be exactly the fully qualified name of the message.

#### proto

```proto
package google.protobuf;
message Empty {}
```

#### bqpb

```json
{
  "message google.protobuf.Empty": {}
}
```

### Field definition

A field is a key-value pair in the message definition.

#### Type

The `type` key accepts any of the types in the proto:

- The scalar types: `uint32`, `int32`, `sint32`, `uint64`, `int64`, `sint64`, `fixed32`, `sfixed32`, `fixed64`, `sfixed64`, `float`, `double`, `bool`, `bytes`, and `string`
- Message types, such as `google.protobuf.Timestamp`
- Enum types, such as `google.protobuf.Field.Kind`. The type name is considered an enum if it is defined as an enum in the `typedefs` argument.
- Map types, such as `map<string, uint32>`.

#### Note on field names

Field names are simply used as keys in the JSON representation verbatim. Therefore, any names will do regardless how it was defined in the original `.proto` file. Nonetheless, the recommended rules are:

1. If there is `[json_name="<name>"]` annotation, use it.
2. Otherwise, convert the original field name (usually in snake_case) to camelCase.
3. Optionally you can use the original snake_case name if you prefer. This is defined to be an allowed option in the JSON serialization spec.

#### proto (edition 2023)

```proto
message Foo {
  uint32 my_field1 = 1;
  string my_field2 = 2;
}
```

#### bqpb

```json
{
  "message Foo": {
    "myField1": { "type": "uint32", "id": 1 },
    "myField2": { "type": "string", "id": 2 }
  }
}
```

### Repeated field

#### proto

```proto
message Foo {
  repeated uint32 my_field1 = 1;
}
```

#### bqpb

```json
{
  "message Foo": {
    "myField1": { "type": "uint32", "id": 1, "repeated": true }
  }
}
```

### Field with explicit presence (optional field)

In bqpb, explicit presence is the default and is equivalent to `"fieldPresence": "explicit"`.

#### proto2 / proto3

```proto
message Foo {
  optional uint32 my_field1 = 1;
}
```

#### proto (edition 2023)

```proto
message Foo {
  uint32 my_field1 = 1;
}
```

#### bqpb
  
```json
{
  "message Foo": {
    "myField1": { "type": "uint32", "id": 1 }
  }
}
```

or equivalently:

```json
{
  "message Foo": {
    "myField1": { "type": "uint32", "id": 1, "fieldPresence": "explicit" }
  }
}
```

### Field with implicit presence (proto3 required field)

#### proto3

```proto
message Foo {
  uint32 my_field1 = 1;
}
```

#### proto (edition 2023)

```proto
message Foo {
  uint32 my_field1 = 1 [features.field_presence = IMPLICIT];
}
```

#### bqpb

```json
{
  "message Foo": {
    "myField1": { "type": "uint32", "id": 1, "fieldPresence": "implicit" }
  }
}
```

### Legacy required field

#### proto2

```proto
message Foo {
  required uint32 my_field1 = 1;
}
```

#### proto (edition 2023)

```proto
message Foo {
  uint32 my_field1 = 1 [features.field_presence = LEGACY_REQUIRED];
}
```

#### bqpb

Not supported yet. If your message is well-formed, this is equivalent to both IMPLICIT and EXPLICIT modes.

### Oneof

#### proto

```proto
message Foo {
  oneof my_group1 {
    uint32 my_field1 = 1;
    string my_field2 = 2;
  }
}
```

#### bqpb

```json
{
  "message Foo": {
    "myField1": { "type": "uint32", "id": 1, "oneofGroup": "myGroup1" },
    "myField2": { "type": "string", "id": 2, "oneofGroup": "myGroup1" }
  }
}
```

Note that the behavior is currently equivalent to specifying `"fieldPresence": "explicit"` in all fields in the oneof group.

### Map

The whole type syntax, including the generics parameters, can be placed in the `type` field, and it is parsed on-demand.

#### proto

```proto
message Foo {
  map<string, uint32> my_field1 = 1;
}
```

#### bqpb

```json
{
  "message Foo": {
    "myField1": { "type": "map<string,uint32>", "id": 1 }
  }
}
```

### proto2 group

proto2 group is represented as a submessage with `"messageEncoding": "delimited"` option. By default, it is `"messageEncoding": "lengthPrefixed"`.

#### proto2

```proto
message Foo {
  optional group My_group = 1 {
    optional uint32 my_field1 = 1;
  }
}
```

#### proto (edition 2023)

```proto
message Foo {
  message My_group {
    uint32 my_field1 = 1;
  }
  My_group my_group = 1 [features.message_encoding = DELIMITED];
}
```

#### bqpb

```json
{
  "message Foo": {
    "myGroup": {
      "myField1": { "type": "uint32", "id": 1, "messageEncoding": "delimited" }
    }
  },
  "message Foo.My_group": {
    "myField1": { "type": "uint32", "id": 1 }
  }
}
```

### Enum definition

An enum is defined as a top-level key in the form of `"enum <enum_name>"`.

#### proto

```proto
enum MyEnum {
  MY_ENUM_UNSPECIFIED = 0;
  MY_ENUM_VALUE1 = 1;
  MY_ENUM_VALUE2 = 2;
}
```

#### bqpb

```json
{
  "enum MyEnum": {
    "MY_ENUM_UNSPECIFIED": 0,
    "MY_ENUM_VALUE1": 1,
    "MY_ENUM_VALUE2": 2
  }
}
```

## Output format

The `parseProtobuf` function returns `JSON`. The output is basically equivalent to what the following algorithm would produce in a spec-compliant implementation:

```js
const value = MessageType.unmarshalProto(protobuf_expr);
return MessageType.marshalJSON(value);
```

Specifically, the implementation is tested against the official implementation in Go.

However, there are some known differences too:

- bqpb emits fields with default values by default (equivalent to `EmitUnpopulated` in protobuf-go). This format is considered more convenient for analysis.
- If it encounters an unknown field ID, it emits a special field named like `#12345` with inferred deserialization. Example output:
  ```json
  {
    "#1": "unknown:uint32:42",
    "#2": "unknown:string:Hello"
  }
  ```
