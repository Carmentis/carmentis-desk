import * as v from "valibot";
import {DcqlQuery} from "dcql";

export const CredentialPresentationSchema = v.object({
    audience: v.string(),
    nonce: v.string(),
    query: v.unknown() as v.GenericSchema<DcqlQuery.Input>
});
export type CredentialPresentation = v.InferOutput<typeof CredentialPresentationSchema>;