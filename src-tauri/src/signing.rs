use sha2::{Digest, Sha256};

#[derive(Debug, serde::Serialize)]
pub struct CertificateInfo {
    pub thumbprint: String,
    pub subject: String,
    pub issuer: String,
    pub friendly_name: Option<String>,
}

#[cfg(target_os = "windows")]
mod platform {
    use super::CertificateInfo;
    use windows::Win32::Security::Cryptography::{
        CertCloseStore, CertFindCertificateInStore, CertFreeCertificateContext, CertOpenStore,
        CryptAcquireCertificatePrivateKey, NCryptSignHash, CertGetNameStringW, CertEnumCertificatesInStore,
        CertGetCertificateContextProperty, CertGetCertificateChain, CertFreeCertificateChain,
        CERT_FIND_HASH, CERT_QUERY_ENCODING_TYPE, CERT_NAME_SIMPLE_DISPLAY_TYPE, CERT_NAME_ISSUER_FLAG,
        CERT_STORE_PROV_SYSTEM_W, CERT_SYSTEM_STORE_CURRENT_USER, CRYPT_ACQUIRE_ONLY_NCRYPT_KEY_FLAG,
        NCRYPT_KEY_HANDLE, BCRYPT_PKCS1_PADDING_INFO, BCRYPT_SHA256_ALGORITHM,
        NCRYPT_PAD_PKCS1_FLAG, CERT_KEY_SPEC, CERT_CONTEXT, CERT_HASH_PROP_ID, HCERTSTORE,
        CERT_CHAIN_PARA, CERT_CHAIN_CONTEXT, HCERTCHAINENGINE,
    };
    use windows::Win32::Security::Cryptography::CERT_OPEN_STORE_FLAGS;
    use windows::Win32::Security::Cryptography::HCRYPTPROV_OR_NCRYPT_KEY_HANDLE;
    use windows::Win32::Security::Cryptography::CERT_FRIENDLY_NAME_PROP_ID;
    use std::ffi::c_void;

    // Manual equivalent of the Win32 CRYPT_HASH_BLOB struct.
    // Defined locally since windows-rs may not export it under this name;
    // the layout matches the C ABI exactly, which is all that matters here.
    #[repr(C)]
    struct CryptHashBlob {
        cb_data: u32,
        pb_data: *mut u8,
    }

    pub fn is_available() -> bool {
        true
    }

    fn open_store() -> Result<HCERTSTORE, String> {
        unsafe {
            let store_name = windows::core::w!("MY");
            CertOpenStore(
                CERT_STORE_PROV_SYSTEM_W,
                CERT_QUERY_ENCODING_TYPE(0),
                None,
                CERT_OPEN_STORE_FLAGS(CERT_SYSTEM_STORE_CURRENT_USER),
                Some(store_name.0 as *const c_void),
            )
            .map_err(|e| format!("CertOpenStore failed: {e}"))
        }
    }

    pub fn certificate_chain_der_by_thumbprint(thumbprint: &str) -> Result<Vec<Vec<u8>>, String> {
        let store = open_store()?;
        let cert_ctx = find_certificate_by_thumbprint(store, thumbprint)?;

        let mut chain_para = CERT_CHAIN_PARA::default();
        chain_para.cbSize = std::mem::size_of::<CERT_CHAIN_PARA>() as u32;
        // RequestedUsage left zeroed: no EKU filtering, accept any chain shape.

        let result = unsafe {
            let mut chain_ctx: *mut CERT_CHAIN_CONTEXT = std::ptr::null_mut();

            CertGetCertificateChain(
                HCERTCHAINENGINE::default(),  // default chain engine
                cert_ctx,
                None,                                // pTime: use current system time
                store,                    // also look into our own store for intermediates
                &chain_para,
                0u32,                              // no revocation checking, no policy constraints
                None,
                &mut chain_ctx,
            )
            .map_err(|e| format!("CertGetCertificateChain failed: {e}"))?;

            let der_chain = extract_der_chain(chain_ctx);

            CertFreeCertificateChain(chain_ctx);

            der_chain
        };

        unsafe { let _ = CertFreeCertificateContext(Some(cert_ctx as *const CERT_CONTEXT)); }
        unsafe { let _ = CertCloseStore(store, 0); }

        Ok(result)
    }

    // Walks the first simple chain (leaf -> ... -> root) and extracts each
    // element's raw DER bytes, in that order.
    unsafe fn extract_der_chain(chain_ctx: *const CERT_CHAIN_CONTEXT) -> Vec<Vec<u8>> {
        let ctx = &*chain_ctx;
        if ctx.cChain == 0 {
            return Vec::new();
        }

        // rgpChain is an array of pointers to CERT_SIMPLE_CHAIN; take the first one
        // (additional entries only appear with cross-certification scenarios,
        // not relevant for a standard operator certificate chain).
        let simple_chain = &**ctx.rgpChain;
        let elements = std::slice::from_raw_parts(simple_chain.rgpElement, simple_chain.cElement as usize);

        elements
            .iter()
            .map(|&element_ptr| {
                let element = &*element_ptr;
                let cert = &*element.pCertContext;
                std::slice::from_raw_parts(cert.pbCertEncoded, cert.cbCertEncoded as usize).to_vec()
            })
            .collect()
    }

    // Looks up a certificate in the given store by its SHA-1 thumbprint.
    // Caller is responsible for freeing the returned context with
    // CertFreeCertificateContext once done with it.
    fn find_certificate_by_thumbprint(
        store: HCERTSTORE,
        thumbprint: &str,
    ) -> Result<*mut CERT_CONTEXT, String> {
        let thumb_bytes = thumbprint_to_bytes(thumbprint)?;

        let hash_blob = CryptHashBlob {
            cb_data: thumb_bytes.len() as u32,
            pb_data: thumb_bytes.as_ptr() as *mut u8,
        };

        unsafe {
            let cert_ctx = CertFindCertificateInStore(
                store,
                CERT_QUERY_ENCODING_TYPE(0x00010001), // X509_ASN_ENCODING | PKCS_7_ASN_ENCODING
                0,
                CERT_FIND_HASH,
                Some(&hash_blob as *const _ as *const c_void),
                None,
            );

            if cert_ctx.is_null() {
                return Err("certificate not found for given thumbprint".into());
            }

            Ok(cert_ctx)
        }
    }

    pub fn get_certificate_der(cert_ctx: *const CERT_CONTEXT) -> Result<Vec<u8>, String> {
        unsafe {
            let ctx = &*cert_ctx;
            if ctx.pbCertEncoded.is_null() || ctx.cbCertEncoded == 0 {
                return Err("certificate has no encoded data".into());
            }

            let der = std::slice::from_raw_parts(ctx.pbCertEncoded, ctx.cbCertEncoded as usize);
            Ok(der.to_vec())
        }
    }

    pub fn certificate_der_by_thumbprint(thumbprint: &str) -> Result<Vec<u8>, String> {
        let store = open_store()?;
        let cert_ctx = find_certificate_by_thumbprint(store, thumbprint)?;
        let der = get_certificate_der(cert_ctx);

        unsafe { let _ = CertFreeCertificateContext(Some(cert_ctx as *const CERT_CONTEXT)); }
        unsafe { let _ = CertCloseStore(store, 0); }

        der
    }

    pub fn list() -> Result<Vec<CertificateInfo>, String> {
        let store = open_store()?;
        let certs = list_certificates(store);
        unsafe { let _ = CertCloseStore(store, 0); }
        Ok(certs)
    }

    pub fn list_certificates(store: HCERTSTORE) -> Vec<CertificateInfo> {
        let mut certs = Vec::new();
        let mut cert_ctx: *mut CERT_CONTEXT = std::ptr::null_mut();

        unsafe {
            loop {
                let next = CertEnumCertificatesInStore(store, Some(cert_ctx as *const CERT_CONTEXT));
                cert_ctx = match next {
                    p if !p.is_null() => p,
                    _ => break,
                };

                let mut hash = [0u8; 20];
                let mut hash_len = hash.len() as u32;
                let ok = CertGetCertificateContextProperty(
                    cert_ctx,
                    CERT_HASH_PROP_ID,
                    Some(hash.as_mut_ptr() as *mut c_void),
                    &mut hash_len,
                );

                if ok.is_ok() {
                    certs.push(CertificateInfo {
                        thumbprint: hash.iter().map(|b| format!("{:02X}", b)).collect(),
                        subject: get_name(cert_ctx, false),
                        issuer: get_name(cert_ctx, true),
                        friendly_name: get_friendly_name(cert_ctx),
                    });
                }
            }
        }

        certs
    }

    fn get_name(cert_ctx: *const CERT_CONTEXT, issuer: bool) -> String {
        unsafe {
            let flags = if issuer { CERT_NAME_ISSUER_FLAG } else { 0 };

            // First call to get the required buffer length (in UTF-16 code units, including null terminator).
            let len = CertGetNameStringW(
                cert_ctx,
                CERT_NAME_SIMPLE_DISPLAY_TYPE,
                flags,
                None,
                None,
            );

            let mut buf = vec![0u16; len as usize];
            CertGetNameStringW(
                cert_ctx,
                CERT_NAME_SIMPLE_DISPLAY_TYPE,
                flags,
                None,
                Some(&mut buf),
            );

            // Trim the trailing null terminator before converting.
            String::from_utf16_lossy(&buf[..buf.len().saturating_sub(1)])
        }
    }

    fn get_friendly_name(cert_ctx: *const CERT_CONTEXT) -> Option<String> {
        unsafe {
            let mut len: u32 = 0;
            let ok = CertGetCertificateContextProperty(
                cert_ctx,
                CERT_FRIENDLY_NAME_PROP_ID,
                None,
                &mut len,
            );
            if ok.is_err() || len == 0 {
                return None; // not all certificates have a friendly name set
            }

            let mut buf = vec![0u8; len as usize];
            CertGetCertificateContextProperty(
                cert_ctx,
                CERT_FRIENDLY_NAME_PROP_ID,
                Some(buf.as_mut_ptr() as *mut c_void),
                &mut len,
            )
            .ok()?;

            // Property is stored as a null-terminated UTF-16 string.
            let utf16: Vec<u16> = buf
                .chunks_exact(2)
                .map(|b| u16::from_le_bytes([b[0], b[1]]))
                .collect();
            Some(String::from_utf16_lossy(&utf16[..utf16.len().saturating_sub(1)]))
        }
    }

    // Converts a hex thumbprint string (e.g. "A1B2C3...") into raw bytes,
    // as required by CERT_FIND_HASH.
    fn thumbprint_to_bytes(thumbprint: &str) -> Result<Vec<u8>, String> {
        (0..thumbprint.len())
            .step_by(2)
            .map(|i| {
                u8::from_str_radix(&thumbprint[i..i + 2], 16)
                    .map_err(|e| format!("invalid thumbprint hex: {e}"))
            })
            .collect()
    }

    pub fn sign(hash: &[u8], cert_thumbprint: &str) -> Result<Vec<u8>, String> {
        unsafe {
            eprintln!("opening store...");
            let store = open_store()?;
            eprintln!("store opened: {:?}", store);

            eprintln!("finding certificate...");
            let cert_ctx = find_certificate_by_thumbprint(store, cert_thumbprint)?;
            eprintln!("cert_ctx: {:?}", cert_ctx);

            // Retrieve the associated NCrypt private key handle (CNG only, no legacy CSP fallback).
            let mut key_handle = HCRYPTPROV_OR_NCRYPT_KEY_HANDLE::default();
            let mut key_spec = CERT_KEY_SPEC(0);
            let mut caller_free = windows::Win32::Foundation::BOOL(0);

            eprintln!("acquiring private key...");
            CryptAcquireCertificatePrivateKey(
                cert_ctx,
                CRYPT_ACQUIRE_ONLY_NCRYPT_KEY_FLAG,
                None,
                &mut key_handle,
                Some(&mut key_spec),
                Some(&mut caller_free),
            )
            .map_err(|e| format!("failed to acquire private key: {e}"))?;
            eprintln!("key acquired, key_spec = {:?}", key_spec);

            // Sign the pre-computed hash with PKCS#1 v1.5 padding (RS256).
            let padding_info = BCRYPT_PKCS1_PADDING_INFO {
                pszAlgId: BCRYPT_SHA256_ALGORITHM,
            };

            let ncrypt_handle = NCRYPT_KEY_HANDLE(key_handle.0);
            let mut sig_len: u32 = 0;

            eprintln!("signing (size query)...");
            NCryptSignHash(
                ncrypt_handle,
                Some(&padding_info as *const _ as *const c_void),
                hash,
                None,
                &mut sig_len,
                NCRYPT_PAD_PKCS1_FLAG,
            )
            .map_err(|e| format!("NCryptSignHash (size query) failed: {e}"))?;
            eprintln!("sig_len = {}", sig_len);

            let mut signature = vec![0u8; sig_len as usize];

            eprintln!("signing (actual)...");
            NCryptSignHash(
                ncrypt_handle,
                Some(&padding_info as *const _ as *const c_void),
                hash,
                Some(&mut signature),
                &mut sig_len,
                NCRYPT_PAD_PKCS1_FLAG,
            )
            .map_err(|e| format!("NCryptSignHash failed: {e}"))?;
            eprintln!("done");

            signature.truncate(sig_len as usize);

            let _ = CertFreeCertificateContext(Some(cert_ctx as *const CERT_CONTEXT));
            let _ = CertCloseStore(store, 0);

            Ok(signature)
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod platform {
    use super::CertificateInfo;
    pub fn is_available() -> bool {
        false
    }

    pub fn sign(_hash: &[u8], _cert_thumbprint: &str) -> Result<Vec<u8>, String> {
        Err("signing not supported on this platform yet".into())
    }

    pub fn list() -> Result<Vec<CertificateInfo>, String> {
        Err("certificate listing not supported on this platform yet".into())
    }

    pub fn certificate_der_by_thumbprint(_thumbprint: &str) -> Result<Vec<u8>, String> {
        Err("certificate export not supported on this platform yet".into())
    }

    pub fn certificate_chain_der_by_thumbprint(_thumbprint: &str) -> Result<Vec<Vec<u8>>, String> {
        Err("certificate chain export not supported on this platform yet".into())
    }
}

#[tauri::command]
pub async fn sign_data(payload: Vec<u8>, cert_thumbprint: String) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let hash = Sha256::digest(&payload);
        platform::sign(&hash, &cert_thumbprint)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_certificates() -> Result<Vec<CertificateInfo>, String> {
    tauri::async_runtime::spawn_blocking(platform::list)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_certificate_der(cert_thumbprint: String) -> Result<Vec<u8>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        platform::certificate_der_by_thumbprint(&cert_thumbprint)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_certificate_chain_der(cert_thumbprint: String) -> Result<Vec<Vec<u8>>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        platform::certificate_chain_der_by_thumbprint(&cert_thumbprint)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn is_certificate_store_available() -> bool {
    platform::is_available()
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::{Engine as _, engine::general_purpose};

    use windows::core::PCWSTR;
    use windows::Win32::Security::Cryptography::{
        CertOpenStore,
        CERT_QUERY_ENCODING_TYPE,
        CERT_STORE_PROV_SYSTEM_W, CERT_SYSTEM_STORE_CURRENT_USER,
    };
    use windows::Win32::Security::Cryptography::CERT_OPEN_STORE_FLAGS;
    use std::ffi::c_void;

    #[test]
    fn list_all_certificates() {
        unsafe {
            let store_name = PCWSTR::from_raw(windows::core::w!("MY").as_ptr());
            eprintln!("opening store...");
            let store = CertOpenStore(
                CERT_STORE_PROV_SYSTEM_W,
                CERT_QUERY_ENCODING_TYPE(0),
                None,
                CERT_OPEN_STORE_FLAGS(CERT_SYSTEM_STORE_CURRENT_USER),
                Some(store_name.0 as *const c_void),
            )
            .expect("CertOpenStore failed"); // panics with message on error, fine for a test
            eprintln!("store opened: {:?}", store);

            let certs = platform::list_certificates(store);
            for c in &certs {
                println!("found: {:?}", c);
            }
            assert!(!certs.is_empty(), "store appears empty");
        }
    }

    #[test]
    fn sign_with_test_certificate() {
        let payload = b"test-jws-signing-input".to_vec();
        let thumbprint = "459EFC2AB9C62CAB16D8C8CAD2471630D8969C35";

        let hash = Sha256::digest(&payload);
        let result = platform::sign(&hash, thumbprint);

        assert!(result.is_ok(), "signing failed: {:?}", result.err());
        let signature = result.unwrap();
        let encoded = general_purpose::STANDARD.encode(&signature);
        println!("signature ({} bytes): {}", signature.len(), encoded);
    }
}
