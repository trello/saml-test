# Trello SAML Test Tool

* Requires Node.js v5+.
* Clone the repository and run `npm install` to setup.
* Edit `config/idp.json` with your identity provider's information. Do not
  change `config/sp.json`.
* Create a sample assertion as xml and save somewhere.
* Run `node index.js < assertion.xml`. If it does not succeed, you
  will get some information as to why it is failing.
