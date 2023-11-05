//go:generate ./gen.sh
package baseline_test

import (
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
			datatype: &examplepb.RequiredUint32{},
			want:     `{"myField":1}`,
		},
		{
			name:     "Parse non-optional field with default value",
			data:     []byte(""),
			datatype: &examplepb.RequiredUint32{},
			want:     `{"myField":0}`,
		},
		{
			name:     "Pick the last one on duplicate in non-optional field",
			data:     []byte("\x08\x01\x08\x02"),
			datatype: &examplepb.RequiredUint32{},
			want:     `{"myField":2}`,
		},
		{
			name:     "Parse optional simple field",
			data:     []byte("\x08\x01"),
			datatype: &examplepb.OptionalUint32{},
			want:     `{"myField":1}`,
		},
		// {
		// 	name:     "Parse optional field with null",
		// 	data:     []byte(""),
		// 	datatype: &examplepb.OptionalUint32{},
		// 	want:     `{"myField":null}`,
		// },
		{
			name:     "Pick the last one on duplicate in optional field",
			data:     []byte("\x08\x01\x08\x02"),
			datatype: &examplepb.OptionalUint32{},
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
		// For unknown reason, it sometimes emits whitespace and sometimes not.
		// {
		// 	name:     "Parse non-repeated fiel of size 2",
		// 	data:     []byte("\x08\x01\x08\x02"),
		// 	datatype: &examplepb.RepeatedUint32{},
		// 	want:     `{"myField":[1, 2]}`,
		// },
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
			if diff := cmp.Diff(tc.want, got); diff != "" {
				t.Errorf("protojson.Format() mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
