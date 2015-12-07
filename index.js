"use strict"

const fs = require('fs')
const saml = require('saml2-js')
const tty = require('tty')
const xmlcrypto = require('xml-crypto')
const xmldom = require('xmldom')

const XMLNS_SAML = 'urn:oasis:names:tc:SAML:2.0:assertion'

const usage = function(err) {
  return err + "\nUsage: node index.js < assertion.xml"
}

const die = function(err) {
  console.error(err)
  process.exit(1)
}

const SEP = "--------------------------------------------------"

const formatPEM = function(certificate) {
  if (/^-----BEGIN/.test(certificate)) {
    return certificate
  } else {
    return [
      "-----BEGIN CERTIFICATE-----",
      ...certificate.match(/.{1,64}/g),
      "-----END CERTIFICATE-----",
    ].join("\n")
  }
}

if (parseInt(process.versions.node.split('.')[0]) < 5) {
  die(usage("Requires node v5 or greater"))
}

const spConfig = require("./config/sp.json")
let idpConfig

try {
  idpConfig = require("./config/idp.json")
  if (!('loginUrl' in idpConfig)) {
    throw Error("No loginUrl specified in configuration")
  }
  if (!('certificate' in idpConfig)) {
    throw Error("No certificate specified in configuration")
  }
} catch (err) {
  die(usage("Could not load configuration: " + err.message))
}

const idp = new saml.IdentityProvider({
  sso_login_url: idpConfig.loginUrl,
  certificates: idpConfig.certificate
})

const sp = new saml.ServiceProvider({
  entity_id: spConfig.entityId,
  nameid_format: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
  allow_unencrypted_assertion: true
})

if (tty.isatty(process.stdin.fd)) {
  die(usage("Standard input is not a file"))
}

const response = fs.readFileSync(process.stdin.fd)

sp.post_assert(idp, {
  request_body: { SAMLResponse: response.toString('base64') }
}, (err, res) => {
  if (!err) {
    console.log("Authn response was accepted")
    return
  }

  console.error("Did not accept authn response: " + err.message)

  // If it's not about the signature, we can't do more
  if (!/SAML Assertion signature check failed/.test(err.message)) {
    die()
  }

  console.log("Trying direct signature check")

  const doc = new xmldom.DOMParser().parseFromString(response.toString('utf-8'))
  const assertions = doc.getElementsByTagNameNS(XMLNS_SAML, 'Assertion')

  if (assertions.length !== 1) {
    die("Expected 1 Assertion; found " + assertions.length)
  }
  const assertion = assertions[0]

  console.log("Found assertion:")
  console.log(SEP)
  console.log(assertion.toString())
  console.log(SEP)

  const signatures = xmlcrypto.xpath(assertion,
    ".//*[local-name(.)='Signature' and namespace-uri(.)='http://www.w3.org/2000/09/xmldsig#']"
  )
  if (signatures.length !== 1) {
    die("Expected 1 Signature; found " + signatures.length)
  }
  const signature = signatures[0]

  console.log("Found signature node:")
  console.log(SEP)
  console.log(signature.toString())
  console.log(SEP)

  const signed = new xmlcrypto.SignedXml()
  signed.keyInfoProvider = {
    getKey: () => formatPEM(idpConfig.certificate)
  }
  signed.loadSignature(signature)

  console.log("Found references:")
  for (let reference of signed.references) {
    console.log(SEP)
    console.log(reference)
  }
  console.log(SEP)

  if (signed.checkSignature(assertion.toString())) {
    console.log("Direct signature check passed. I have no idea what's wrong.")
    return
  }

  console.error("The following validation errors occurred:")
  for (let err of signed.validationErrors) {
    console.error("  " + err)
  }

  // Try
})
