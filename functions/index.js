const functions = require('firebase-functions');
const express = require('express');
const bodyParser = require('body-parser');
const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('DocuSign Embedded Signing Example');
});

app.post('/create-envelope', async (req, res) => {
    try {
        // DocuSign credentials from .env
        const { CLIENT_ID, USER_ID, PRIVATE_KEY, REDIRECT_URI, API_BASE_PATH } = process.env;

        // JWT Authentication
        const dsApiClient = new docusign.ApiClient();
        dsApiClient.setOAuthBasePath(API_BASE_PATH);

        const results = await dsApiClient.requestJWTUserToken(
            CLIENT_ID,
            USER_ID,
            'signature',
            PRIVATE_KEY,
            3600
        );
        const accessToken = results.body.access_token;

        dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
        docusign.Configuration.default.setDefaultApiClient(dsApiClient);

        // Create an envelope
        const envelopesApi = new docusign.EnvelopesApi();
        const envelope = new docusign.EnvelopeDefinition();
        envelope.emailSubject = 'Please sign this document';

        // Add a document
        const document = new docusign.Document();
        const docBase64 = fs.readFileSync(path.resolve(__dirname, 'test.pdf')).toString('base64');
        document.documentBase64 = docBase64;
        document.name = 'Test Document';
        document.fileExtension = 'pdf';
        document.documentId = '1';
        envelope.documents = [document];

        // Add a recipient
        const signer = new docusign.Signer();
        signer.email = req.body.email;
        signer.name = req.body.name;
        signer.recipientId = '1';
        signer.clientUserId = '1000'; // Unique for each recipient

        const signHere = new docusign.SignHere();
        signHere.documentId = '1';
        signHere.pageNumber = '1';
        signHere.recipientId = '1';
        signHere.xPosition = '100';
        signHere.yPosition = '150';

        const tabs = new docusign.Tabs();
        tabs.signHereTabs = [signHere];
        signer.tabs = tabs;

        envelope.recipients = new docusign.Recipients();
        envelope.recipients.signers = [signer];
        envelope.status = 'sent';

        // Send the envelope
        const resultsEnvelope = await envelopesApi.createEnvelope('account_id', { envelopeDefinition: envelope });
        const envelopeId = resultsEnvelope.envelopeId;

        // Generate recipient view (embedded signing URL)
        const viewRequest = new docusign.RecipientViewRequest();
        viewRequest.returnUrl = REDIRECT_URI;
        viewRequest.authenticationMethod = 'email';
        viewRequest.email = req.body.email;
        viewRequest.userName = req.body.name;
        viewRequest.clientUserId = '1000';

        const recipientView = await envelopesApi.createRecipientView('account_id', envelopeId, { recipientViewRequest: viewRequest });
        res.json({ url: recipientView.url });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

exports.app = functions.https.onRequest(app);


