//go:generate ./gen.sh
package baseline_test

import (
	"strings"
	"testing"

	"github.com/google/go-cmp/cmp"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/reflect/protoreflect"

	"github.com/qnighy/bqpb/baseline/examplepb"
)

func TestSerialization(t *testing.T) {
	testcases := []struct {
		name     string
		data     []byte
		datatype protoreflect.ProtoMessage
		want     string
	}{
		{
			name:     "Parse non-optional simple field",
			data:     []byte("\x08\x01"),
			datatype: &examplepb.ImplicitUint32{},
			want:     `{"myField":1}`,
		},
		{
			name:     "Parse non-optional field with default value",
			data:     []byte(""),
			datatype: &examplepb.ImplicitUint32{},
			want:     `{"myField":0}`,
		},
		{
			name:     "Pick the last one on duplicate in non-optional field",
			data:     []byte("\x08\x01\x08\x02"),
			datatype: &examplepb.ImplicitUint32{},
			want:     `{"myField":2}`,
		},
		{
			name:     "Parse field with explicit presence of size 1",
			data:     []byte("\x08\x01"),
			datatype: &examplepb.ExplicitUint32{},
			want:     `{"myField":1}`,
		},
		{
			name:     "Parse field with explicit presence of size 2",
			data:     []byte(""),
			datatype: &examplepb.ExplicitUint32{},
			want:     `{}`,
		},
		{
			name:     "Pick the last one on duplicate in field with explicit presence",
			data:     []byte("\x08\x01\x08\x02"),
			datatype: &examplepb.ExplicitUint32{},
			want:     `{"myField":2}`,
		},
		{
			name:     "Parse non-repeated field of size 1",
			data:     []byte("\x08\x01"),
			datatype: &examplepb.RepeatedUint32{},
			want:     `{"myField":[1]}`,
		},
		{
			name:     "Parse non-repeated field of size 0",
			data:     []byte(""),
			datatype: &examplepb.RepeatedUint32{},
			want:     `{"myField":[]}`,
		},
		{
			name:     "Parse non-repeated fiel of size 2",
			data:     []byte("\x08\x01\x08\x02"),
			datatype: &examplepb.RepeatedUint32{},
			want:     `{"myField":[1,2]}`,
		},
		{
			name:     "enum",
			data:     []byte("\x08\x00\x08\x01\x08\x02\x08\x03"),
			datatype: &examplepb.RepeatedEnum{},
			want:     `{"myField":["MY_ENUM_UNSPECIFIED","MY_ENUM_VALUE_1","MY_ENUM_VALUE_2",3]}`,
		},
		{
			name:     "enum with implicit presene with default value",
			data:     []byte(""),
			datatype: &examplepb.ImplicitEnum{},
			want:     `{"myField":"MY_ENUM_UNSPECIFIED"}`,
		},
		{
			name:     "enum with explicit presence with default value",
			data:     []byte(""),
			datatype: &examplepb.ExplicitEnum{},
			want:     `{}`,
		},
		{
			name:     "bool",
			data:     []byte("\x08\x00\x08\x01"),
			datatype: &examplepb.RepeatedBool{},
			want:     `{"myField":[false,true]}`,
		},
		{
			name:     "uint32",
			data:     []byte("\x08\x00\x08\x01\x08\x02\x08\xff\xff\xff\xff\x0f"),
			datatype: &examplepb.RepeatedUint32{},
			want:     `{"myField":[0,1,2,4294967295]}`,
		},
		{
			name:     "int32",
			data:     []byte("\x08\x00\x08\x01\x08\x02\x08\xff\xff\xff\xff\x0f"),
			datatype: &examplepb.RepeatedInt32{},
			want:     `{"myField":[0,1,2,-1]}`,
		},
		{
			name:     "sint32",
			data:     []byte("\x08\x00\x08\x01\x08\x02\x08\x03\x08\x04"),
			datatype: &examplepb.RepeatedSint32{},
			want:     `{"myField":[0,-1,1,-2,2]}`,
		},
		{
			name:     "uint64",
			data:     []byte("\x08\x00\x08\x01\x08\x02\x08\xff\xff\xff\xff\xff\xff\xff\xff\xff\x01"),
			datatype: &examplepb.RepeatedUint64{},
			want:     `{"myField":["0","1","2","18446744073709551615"]}`,
		},
		{
			name:     "int64",
			data:     []byte("\x08\x00\x08\x01\x08\x02\x08\xff\xff\xff\xff\xff\xff\xff\xff\xff\x01"),
			datatype: &examplepb.RepeatedInt64{},
			want:     `{"myField":["0","1","2","-1"]}`,
		},
		{
			name:     "sint64",
			data:     []byte("\x08\x00\x08\x01\x08\x02\x08\x03\x08\x04"),
			datatype: &examplepb.RepeatedSint64{},
			want:     `{"myField":["0","-1","1","-2","2"]}`,
		},
		{
			name:     "packed varint",
			data:     []byte("\x0a\x08\x00\x01\x02\xff\xff\xff\xff\x0f"),
			datatype: &examplepb.RepeatedUint32{},
			want:     `{"myField":[0,1,2,4294967295]}`,
		},
		{
			name: "fixed32",
			data: []byte(
				"" +
					"\x0d\x00\x00\x00\x00" +
					"\x0d\x01\x00\x00\x00" +
					"\x0d\x02\x00\x00\x00" +
					"\x0d\xff\xff\xff\xff",
			),
			datatype: &examplepb.RepeatedFixed32{},
			want:     `{"myField":[0,1,2,4294967295]}`,
		},
		{
			name: "sfixed32",
			data: []byte(
				"" +
					"\x0d\x00\x00\x00\x00" +
					"\x0d\x01\x00\x00\x00" +
					"\x0d\x02\x00\x00\x00" +
					"\x0d\xff\xff\xff\xff",
			),
			datatype: &examplepb.RepeatedSfixed32{},
			want:     `{"myField":[0,1,2,-1]}`,
		},
		{
			name: "float",
			data: []byte(
				"" +
					"\x0d\x00\x00\x00\x00" +
					"\x0d\x00\x00\x00\x80" +
					"\x0d\x00\x00\x80\x3f" +
					"\x0d\x00\x00\x80\xbf" +
					"\x0d\x00\x00\xc0\x3f" +
					"\x0d\x00\x00\xc0\xbf" +
					"\x0d\x00\x00\x80\x7f" +
					"\x0d\x00\x00\x80\xff" +
					"\x0d\x00\x00\xc0\x7f" +
					"\x0d\x00\x00\xc0\xff",
			),
			datatype: &examplepb.RepeatedFloat{},
			want:     `{"myField":[0,-0,1,-1,1.5,-1.5,"Infinity","-Infinity","NaN","NaN"]}`,
		},
		{
			name: "packed I32",
			data: []byte(
				"\x0a\x10" +
					"\x00\x00\x00\x00" +
					"\x01\x00\x00\x00" +
					"\x02\x00\x00\x00" +
					"\xff\xff\xff\xff",
			),
			datatype: &examplepb.RepeatedFixed32{},
			want:     `{"myField":[0,1,2,4294967295]}`,
		},
		{
			name: "fixed64",
			data: []byte(
				"" +
					"\x09\x00\x00\x00\x00\x00\x00\x00\x00" +
					"\x09\x01\x00\x00\x00\x00\x00\x00\x00" +
					"\x09\x02\x00\x00\x00\x00\x00\x00\x00" +
					"\x09\xff\xff\xff\xff\xff\xff\xff\xff",
			),
			datatype: &examplepb.RepeatedFixed64{},
			want:     `{"myField":["0","1","2","18446744073709551615"]}`,
		},
		{
			name: "sfixed64",
			data: []byte(
				"" +
					"\x09\x00\x00\x00\x00\x00\x00\x00\x00" +
					"\x09\x01\x00\x00\x00\x00\x00\x00\x00" +
					"\x09\x02\x00\x00\x00\x00\x00\x00\x00" +
					"\x09\xff\xff\xff\xff\xff\xff\xff\xff",
			),
			datatype: &examplepb.RepeatedSfixed64{},
			want:     `{"myField":["0","1","2","-1"]}`,
		},
		{
			name: "double",
			data: []byte(
				"" +
					"\x09\x00\x00\x00\x00\x00\x00\x00\x00" +
					"\x09\x00\x00\x00\x00\x00\x00\x00\x80" +
					"\x09\x00\x00\x00\x00\x00\x00\xf0\x3f" +
					"\x09\x00\x00\x00\x00\x00\x00\xf0\xbf" +
					"\x09\x00\x00\x00\x00\x00\x00\xf8\x3f" +
					"\x09\x00\x00\x00\x00\x00\x00\xf8\xbf" +
					"\x09\x00\x00\x00\x00\x00\x00\xf0\x7f" +
					"\x09\x00\x00\x00\x00\x00\x00\xf0\xff" +
					"\x09\x00\x00\x00\x00\x00\x00\xf8\x7f" +
					"\x09\x00\x00\x00\x00\x00\x00\xf8\xff",
			),
			datatype: &examplepb.RepeatedDouble{},
			want:     `{"myField":[0,-0,1,-1,1.5,-1.5,"Infinity","-Infinity","NaN","NaN"]}`,
		},
		{
			name: "packed I64",
			data: []byte(
				"\x0a\x20" +
					"\x00\x00\x00\x00\x00\x00\x00\x00" +
					"\x01\x00\x00\x00\x00\x00\x00\x00" +
					"\x02\x00\x00\x00\x00\x00\x00\x00" +
					"\xff\xff\xff\xff\xff\xff\xff\xff",
			),
			datatype: &examplepb.RepeatedFixed64{},
			want:     `{"myField":["0","1","2","18446744073709551615"]}`,
		},
		{
			name:     "bytes",
			data:     []byte("\x0a\x00\x0a\x06\x00\x01\x02\x80\x81\x82"),
			datatype: &examplepb.RepeatedBytes{},
			want:     `{"myField":["","AAECgIGC"]}`,
		},
		{
			name:     "string",
			data:     []byte("\x0a\x00\x0a\x06\x61\x62\x63\xe3\x81\x82"),
			datatype: &examplepb.RepeatedString{},
			want:     `{"myField":["","abcあ"]}`,
		},
		{
			name:     "submessage",
			data:     []byte("\x0a\x02\x08\x2a"),
			datatype: &examplepb.RepeatedSubmessage{},
			want:     `{"myField":[{"submessageField":[42]}]}`,
		},
		{
			name:     "submessage with implicit presence with default value",
			data:     []byte(""),
			datatype: &examplepb.ImplicitSubmessage{},
			want:     `{"myField":null}`,
		},
		{
			name:     "submessage with explicit presence with default value",
			data:     []byte(""),
			datatype: &examplepb.ExplicitSubmessage{},
			want:     `{}`,
		},
	}
	for _, tc := range testcases {
		t.Run(tc.name, func(t *testing.T) {
			msg := tc.datatype.ProtoReflect().Type().New().Interface()
			err := proto.Unmarshal(tc.data, msg)
			if err != nil {
				t.Fatalf("Unmarshal error: %v\n", err)
			}
			got := protojson.MarshalOptions{
				EmitUnpopulated: true,
			}.Format(msg)
			// protojson seems to have some random behavior on whitespace.
			// Let's just ignore it for now.
			got = strings.ReplaceAll(got, " ", "")
			if diff := cmp.Diff(tc.want, got); diff != "" {
				t.Errorf("protojson.Format() mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
