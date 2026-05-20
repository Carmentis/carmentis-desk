import {describe, expect, it} from "vitest";
import {type DcqlCredential, DcqlQuery} from 'dcql'
import {WalletSdJwtSigner} from "../src/utils/WalletSdJwtSigner";
import {convertSdJwtToDcqlCredential} from "../src/utils/utils";


describe("DCQL test", () => {
    it("Should create a vp", async () => {
        const credential =
            'eyJ0eXAiOiJzZCtqd3QiLCJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKRlpESTFOVEU1SWl3aWVDSTZJamhNVEd0NVUxTmlaR0Y2VlY5clVXVlJXRUV0ZVVOaVdHbFNhR3BmWTBnME9EWnZSazFQTTFkQloyTWlMQ0pyZEhraU9pSlBTMUFpZlEiLCJpYXQiOjE3Nzg2ODAyODAsInZjdCI6IkVtYWlsQ3JlZGVudGlhbCIsInN1YiI6ImRpZDpqd2s6ZXlKcmRIa2lPaUpQUzFBaUxDSmpjbllpT2lKRlpESTFOVEU1SWl3aVlXeG5Jam9pUldSRVUwRWlMQ0o0SWpvaVpIWjZZelIzTUdWcVlUbDFaMGg1ZDE4MVpWQldjblZETkZNeFVGcEpOVVo0VlhoeGEwcHZhM0J4YnlKOSIsIl9zZCI6WyJSWTJHVGxKX3ExNXJKcGQ3WGJqWWFmcEEtVGgwdTNHRkZzMWwxcnhvaGRFIl0sIl9zZF9hbGciOiJzaGEtMjU2In0.vwLd0qm96gNM_PqvMS49mX3BBBSTztqlmcun7qp-xPj0XSIdG5hjg75P4AM3spb0uhK4-WCQsG6BBzrfGAKwBg~WyJ6TmNFV3NoMTBXWVlxMXhyYWl5TEF3IiwiZW1haWwiLCJnYW1hcmNhZGV0QGdtYWlsLmNvbSJd~';


        const seed = 'SEED{aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}';
        const ws = await WalletSdJwtSigner.createFromSeed(seed);
        const sdjwt = ws.getSdJwtInstance();
        const vp = await sdjwt.present(
            credential,
            undefined,
            {
                kb: {
                    payload: {
                        nonce: "123",
                        iat: 0,
                        aud: ""
                    }
                }
            }
            );
        expect(vp).toBeDefined();
        console.log(vp)
    })
    it("Should run the official example from https://www.npmjs.com/package/dcql?ref=pkgstats.com", async () => {


        const credentials = [
            {
                credential_format: 'mso_mdoc',
                doctype: 'org.iso.7367.1.mVRC',
                cryptographic_holder_binding: true,
                namespaces: {
                    'org.iso.7367.1': {
                        vehicle_holder: 'John Doe',
                    },
                    'org.iso.18013.5.1': {
                        first_name: 'John',
                    },
                },
                authority: {
                    type: 'aki',
                    values: ['21cbb5a0-9d1e-46dc-b8aa-0e85036af442'],
                },
            },
        ] satisfies DcqlCredential[]

        // Create a DCQL query
        const query = {
            credentials: [
                {
                    id: 'my_credential',
                    format: 'mso_mdoc',
                    meta: { doctype_value: 'org.iso.7367.1.mVRC' },
                    claims: [
                        {
                            path: ['org.iso.7367.1', 'vehicle_holder'],
                            intent_to_retain: true,
                        },
                        {
                            path: ['org.iso.18013.5.1', 'first_name'],
                        },
                    ],
                },
            ],
        } satisfies DcqlQuery.Input

        // Parse (structural) and validate (content) the query
        const parsedQuery = DcqlQuery.parse(query)
        DcqlQuery.validate(parsedQuery)

        // Execute the query against credentials
        const queryResult = DcqlQuery.query(parsedQuery, credentials)
        console.log(queryResult)
    })

    it("Should run an example", async () => {
        const credential2 = "eyJ0eXAiOiJzZCtqd3QiLCJhbGciOiJFUzI1NiJ9.eyJpZCI6IjEyMzQiLCJfc2QiOlsiYkRUUnZtNS1Zbi1IRzdjcXBWUjVPVlJJWHNTYUJrNTdKZ2lPcV9qMVZJNCIsImV0M1VmUnlsd1ZyZlhkUEt6Zzc5aGNqRDFJdHpvUTlvQm9YUkd0TW9zRmsiLCJ6V2ZaTlMxOUF0YlJTVGJvN3NKUm4wQlpRdldSZGNob0M3VVphYkZyalk4Il0sIl9zZF9hbGciOiJzaGEtMjU2In0.n27NCtnuwytlBYtUNjgkesDP_7gN7bhaLhWNL4SWT6MaHsOjZ2ZMp987GgQRL6ZkLbJ7Cd3hlePHS84GBXPuvg~WyI1ZWI4Yzg2MjM0MDJjZjJlIiwiZmlyc3RuYW1lIiwiSm9obiJd~WyJjNWMzMWY2ZWYzNTg4MWJjIiwibGFzdG5hbWUiLCJEb2UiXQ~WyJmYTlkYTUzZWJjOTk3OThlIiwic3NuIiwiMTIzLTQ1LTY3ODkiXQ~eyJ0eXAiOiJrYitqd3QiLCJhbGciOiJFUzI1NiJ9.eyJpYXQiOjE3MTAwNjk3MjIsImF1ZCI6ImRpZDpleGFtcGxlOjEyMyIsIm5vbmNlIjoiazh2ZGYwbmQ2Iiwic2RfaGFzaCI6Il8tTmJWSzNmczl3VzNHaDNOUktSNEt1NmZDMUwzN0R2MFFfalBXd0ppRkUifQ.pqw2OB5IA5ya9Mxf60hE3nr2gsJEIoIlnuCa4qIisijHbwg3WzTDFmW2SuNvK_ORN0WU6RoGbJx5uYZh8k4EbA"
        const credential =
            'eyJ0eXAiOiJzZCtqd3QiLCJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKRlpESTFOVEU1SWl3aWVDSTZJamhNVEd0NVUxTmlaR0Y2VlY5clVXVlJXRUV0ZVVOaVdHbFNhR3BmWTBnME9EWnZSazFQTTFkQloyTWlMQ0pyZEhraU9pSlBTMUFpZlEiLCJpYXQiOjE3Nzg2ODAyODAsInZjdCI6IkVtYWlsQ3JlZGVudGlhbCIsInN1YiI6ImRpZDpqd2s6ZXlKcmRIa2lPaUpQUzFBaUxDSmpjbllpT2lKRlpESTFOVEU1SWl3aVlXeG5Jam9pUldSRVUwRWlMQ0o0SWpvaVpIWjZZelIzTUdWcVlUbDFaMGg1ZDE4MVpWQldjblZETkZNeFVGcEpOVVo0VlhoeGEwcHZhM0J4YnlKOSIsIl9zZCI6WyJSWTJHVGxKX3ExNXJKcGQ3WGJqWWFmcEEtVGgwdTNHRkZzMWwxcnhvaGRFIl0sIl9zZF9hbGciOiJzaGEtMjU2In0.vwLd0qm96gNM_PqvMS49mX3BBBSTztqlmcun7qp-xPj0XSIdG5hjg75P4AM3spb0uhK4-WCQsG6BBzrfGAKwBg~WyJ6TmNFV3NoMTBXWVlxMXhyYWl5TEF3IiwiZW1haWwiLCJnYW1hcmNhZGV0QGdtYWlsLmNvbSJd~';

        const credentials = [
            await convertSdJwtToDcqlCredential(credential),
            await convertSdJwtToDcqlCredential(credential2),
        ] satisfies DcqlCredential[]

        const encodedCredentials = [
            credential,
            credential2,
        ]

        /*
        {
  "jsonrpc": "2.0",
  "id": 1,
  "method": "ping",
  "params": {
"audience": "test", "nonce": "123", "query": { "credentials": [{ "format": "vc+sd-jwt", "id": "my-cred", "claims": [{"path": "email"}] }] }
}
}
         */
        const query = {
            credentials: [
                {
                    id: 'my_credential',
                    format: 'vc+sd-jwt',
                    claims: [
                        { path:  ['email'] },
                    ],
                },
            ],
        } satisfies DcqlQuery.Input;

        // Parse (structural) and validate (content) the query
        const parsedQuery = DcqlQuery.parse(query)
        DcqlQuery.validate(parsedQuery)

        // Execute the query against credentials

        const queryResult = DcqlQuery.query(parsedQuery, credentials)

        expect(queryResult.can_be_satisfied).toBe(true)
        const validCredentials = queryResult.credential_matches["my_credential"].valid_credentials
        expect(validCredentials.length).toBe(1)
        const test = validCredentials[0]
        const index = test.input_credential_index;
        const encodedUsedCredential = encodedCredentials[index]
        console.log(encodedUsedCredential)
    })
})