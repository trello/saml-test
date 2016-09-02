# Trello SAML Test Tool

* Requires Node.js v5+.
* Clone the repository and run `npm install` to setup.
* Edit `config/idp.json` with your identity provider's information. Do not
  change `config/sp.json`.
* Create a sample assertion as xml and save somewhere.
* Run `node index.js < assertion.xml`. If it does not succeed, you
  will get some information as to why it is failing.
* You can test against the OneLogin samples from
  https://developers.onelogin.com/saml/examples/response by running

   '''
   for file in onelogin/* ; do echo "#### $file ####"""; node index.js < $file; done
   '''

   ... with the default idp config. Currently examples 3 and 4 from that dir
   pass.
