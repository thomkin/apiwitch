import * as v from 'valibot';

export const RpcRequestSchema = v.object({
  id: v.number(),
  endpoint: v.string(),
  authorization: v.string(),
  params: v.optional(v.any()),
});
