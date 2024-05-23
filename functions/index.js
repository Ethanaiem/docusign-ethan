const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const docusign = require("docusign-esign");
const fs = require("fs");
const session = require("express-session");
const cors = require("cors");
const functions = require("firebase-functions");

dotenv.config();

const app = express();
app.use(cors({
   origin: true, // Your React app's URL
   credentials: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Add this line to parse JSON bodies
app.use(session({
   secret: "dfsf94835asda",
   resave: true,
   saveUninitialized: true,
}));

app.post("/form", async (request, response) => {
   await checkToken(request);
   let envelopesApi = getEnvelopesApi(request);
   let envelope = makeEnvelope(
      request.body.owner_one_name,
      request.body.owner_one_email,
      request.body.company_name,
      request.body.loan_amount,
      request.body.owner_one_contact,
      request.body.owner_one_dob,
      request.body.owner_one_ssn,
      request.body.owner_one_percentage,
      request.body.owner_one_address,
      request.body.owner_one_city,
      request.body.owner_one_state,
      request.body.owner_one_zip,
      request.body.owner_one_cs,
      request.body.owner_two_name,
      request.body.owner_two_email,
      request.body.owner_two_contact,
      request.body.owner_two_dob,
      request.body.owner_two_ssn,
      request.body.owner_two_percentage,
      request.body.owner_two_address,
      request.body.owner_two_city,
      request.body.owner_two_state,
      request.body.owner_two_zip,
      request.body.owner_two_cs,
      request.body.business_address,
      request.body.business_city,
      request.body.business_state,
      request.body.business_zip,
      request.body.business_entity,
      request.body.business_start_date,
      request.body.use_of_loan
   );
   let results = await envelopesApi.createEnvelope(
      process.env.ACCOUNT_ID, { envelopeDefinition: envelope });
   console.log("envelope results ", results);

   let viewRequest = makeRecipientViewRequest(request.body.owner_one_name, request.body.owner_one_email);
   results = await envelopesApi.createRecipientView(process.env.ACCOUNT_ID, results.envelopeId,
      { recipientViewRequest: viewRequest });

   response.json({ url: results.url }); // Send the URL back to the React app
});

console.log("Using DocuSign USER_ID: ", process.env.USER_ID);
console.log("Using Integration Key: ", process.env.INTEGRATION_KEY);
console.log("DocuSign Base Path: ", process.env.BASE_PATH);

function getEnvelopesApi(request) {
   let dsApiClient = new docusign.ApiClient();
   dsApiClient.setBasePath(process.env.BASE_PATH);
   dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + request.session.access_token);
   return new docusign.EnvelopesApi(dsApiClient);
}

function makeEnvelope(owner_one_name, owner_one_email, company_name, loan_amount, owner_one_contact, owner_one_dob, owner_one_ssn, owner_one_percentage, owner_one_address, owner_one_city, owner_one_state, owner_one_zip, owner_one_cs, owner_two_name, owner_two_email, owner_two_contact, owner_two_dob, owner_two_ssn, owner_two_percentage, owner_two_address, owner_two_city, owner_two_state, owner_two_zip, owner_two_cs, business_address, business_city, business_state, business_zip, business_entity, use_of_loan, business_start_date) {
   let env = new docusign.EnvelopeDefinition();
   env.templateId = process.env.TEMPLATE_ID;

   // Construct tabs for owner one
   let ownerOneNameTab = docusign.Text.constructFromObject({ tabLabel: "owner_one_name", value: owner_one_name });
   let ownerOneEmailTab = docusign.Text.constructFromObject({ tabLabel: "owner_one_email", value: owner_one_email });
   let ownerOneContactTab = docusign.Text.constructFromObject({ tabLabel: "owner_one_contact", value: owner_one_contact });
   let ownerOneDobTab = docusign.Text.constructFromObject({ tabLabel: "owner_one_dob", value: owner_one_dob });
   let ownerOneSsnTab = docusign.Text.constructFromObject({ tabLabel: "owner_one_ssn", value: owner_one_ssn });
   let ownerOnePercTab = docusign.Text.constructFromObject({ tabLabel: "owner_one_percentage", value: owner_one_percentage });
   let ownerOneAddressTab = docusign.Text.constructFromObject({ tabLabel: "owner_one_address", value: owner_one_address });
   let ownerOneCityTab = docusign.Text.constructFromObject({ tabLabel: "owner_one_city", value: owner_one_city });
   let ownerOneStateTab = docusign.Text.constructFromObject({ tabLabel: "owner_one_state", value: owner_one_state });
   let ownerOneZipTab = docusign.Text.constructFromObject({ tabLabel: "owner_one_zip", value: owner_one_zip });
   let ownerOneCsTab = docusign.Text.constructFromObject({ tabLabel: "owner_one_cs", value: owner_one_cs });

   // Construct tabs for owner two
   let ownerTwoNameTab = docusign.Text.constructFromObject({ tabLabel: "owner_two_name", value: owner_two_name });
   let ownerTwoEmailTab = docusign.Text.constructFromObject({ tabLabel: "owner_two_email", value: owner_two_email });
   let ownerTwoContactTab = docusign.Text.constructFromObject({ tabLabel: "owner_two_contact", value: owner_two_contact });
   let ownerTwoDobTab = docusign.Text.constructFromObject({ tabLabel: "owner_two_dob", value: owner_two_dob });
   let ownerTwoSsnTab = docusign.Text.constructFromObject({ tabLabel: "owner_two_ssn", value: owner_two_ssn });
   let ownerTwoPercTab = docusign.Text.constructFromObject({ tabLabel: "owner_two_percentage", value: owner_two_percentage });
   let ownerTwoAddressTab = docusign.Text.constructFromObject({ tabLabel: "owner_two_address", value: owner_two_address });
   let ownerTwoCityTab = docusign.Text.constructFromObject({ tabLabel: "owner_two_city", value: owner_two_city });
   let ownerTwoStateTab = docusign.Text.constructFromObject({ tabLabel: "owner_two_state", value: owner_two_state });
   let ownerTwoZipTab = docusign.Text.constructFromObject({ tabLabel: "owner_two_zip", value: owner_two_zip });
   let ownerTwoCsTab = docusign.Text.constructFromObject({ tabLabel: "owner_two_cs", value: owner_two_cs });

   // Construct tabs for business details
   let businessAddressTab = docusign.Text.constructFromObject({ tabLabel: "business_address", value: business_address });
   let businessCityTab = docusign.Text.constructFromObject({ tabLabel: "business_city", value: business_city });
   let businessStateTab = docusign.Text.constructFromObject({ tabLabel: "business_state", value: business_state });
   let businessZipTab = docusign.Text.constructFromObject({ tabLabel: "business_zip", value: business_zip });
   let businessDateTab = docusign.Text.constructFromObject({ tabLabel: "business_start_date", value: business_start_date });
   let businessEntityTab = docusign.Text.constructFromObject({ tabLabel: "business_entity", value: business_entity });
   let useOfLoanTab = docusign.Text.constructFromObject({ tabLabel: "use_of_loan", value: use_of_loan });
   let companyNameTab = docusign.Text.constructFromObject({ tabLabel: "company_name", value: company_name });
   let loanAmountTab = docusign.Text.constructFromObject({ tabLabel: "loan_amount", value: loan_amount });

   // Assemble all tabs into one Tabs object
   let tabs = docusign.Tabs.constructFromObject({
      textTabs: [
         ownerOneNameTab, ownerOneEmailTab, ownerOneContactTab, ownerOneDobTab, ownerOneSsnTab, ownerOnePercTab, ownerOneAddressTab,
         ownerOneCityTab, ownerOneStateTab, ownerOneZipTab, ownerOneCsTab, ownerTwoNameTab, ownerTwoEmailTab, ownerTwoContactTab,
         ownerTwoDobTab, ownerTwoSsnTab, ownerTwoPercTab, ownerTwoAddressTab, ownerTwoCityTab, ownerTwoStateTab, ownerTwoZipTab,
         ownerTwoCsTab, businessAddressTab, businessCityTab, businessStateTab, businessZipTab, businessEntityTab, useOfLoanTab,
         companyNameTab, loanAmountTab, businessDateTab
      ]
   });

   // Define signer and other envelope settings
   let signer1 = docusign.TemplateRole.constructFromObject({
      email: owner_one_email,
      name: owner_one_name,
      tabs: tabs,
      clientUserId: process.env.CLIENT_USER_ID,
      roleName: 'Applicant'
   });

   env.templateRoles = [signer1];
   env.status = "sent";

   return env;
}


function makeRecipientViewRequest(name, email) {
   let viewRequest = new docusign.RecipientViewRequest();

   // viewRequest.returnUrl = "http://localhost:5173/"; // Your React app's success URL
   viewRequest.returnUrl = "https://klendify.webflow.io/pre-qualification-form"; // Your React app's success URL
   viewRequest.authenticationMethod = 'none';

   viewRequest.email = email;
   viewRequest.userName = name;
   viewRequest.clientUserId = process.env.CLIENT_USER_ID;

   return viewRequest;
}

async function checkToken(request) {
   if (request.session.access_token && Date.now() < request.session.expires_at) {
      console.log("re-using access_token ", request.session.access_token);
   } else {
      console.log("generating a new access token");
      let dsApiClient = new docusign.ApiClient();
      dsApiClient.setBasePath(process.env.BASE_PATH);
      const results = await dsApiClient.requestJWTUserToken(
         process.env.INTEGRATION_KEY,
         process.env.USER_ID,
         "signature",
         fs.readFileSync(path.join(__dirname, "private.key")),
         3600
      );
      console.log(results.body);
      request.session.access_token = results.body.access_token;
      request.session.expires_at = Date.now() + (results.body.expires_in - 60) * 1000;
   }
}

app.get("/", async (request, response) => {
   await checkToken(request);
   response.sendFile(path.join(__dirname, "main.html"));
});

app.get("/success", (request, response) => {
   response.send("Success");
});

app.listen(8000, () => {
   console.log("server has started", process.env.USER_ID);
});

exports.api = functions.https.onRequest(app);
