import * as functions from 'firebase-functions';
import * as express from 'express';
const docusign = require('docusign-esign');
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as multer from 'multer';
import * as https from 'https';

dotenv.config();

const app = express();
app.use(express.json());
const upload = multer({
    dest: '/tmp/',
    limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB
}).single('file');
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {}); // Delete the file async. (No need to check the result)
            reject(err.message);
        });
    });
}

app.post('/create-envelope', upload, async (req, res) => {
    try {
        console.log("File received:", req.file);

        const { CLIENT_ID, USER_ID, PRIVATE_KEY, REDIRECT_URI, API_BASE_PATH } = process.env;

        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        const { email, name } = req.body;
        if (!email || !name) {
            return res.status(400).send("Email and name are required");
        }

        // JWT Authentication
        const dsApiClient = new docusign.ApiClient();
        dsApiClient.setOAuthBasePath(API_BASE_PATH!);

        const results = await dsApiClient.requestJWTUserToken(
            CLIENT_ID!,
            USER_ID!,
            'signature',
            PRIVATE_KEY!.replace(/\\n/g, '\n'),
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
        const docBase64 = fs.readFileSync(req.file.path).toString('base64');
        document.documentBase64 = docBase64;
        document.name = 'Uploaded Document';
        document.fileExtension = path.extname(req.file.originalname).replace('.', ''); // e.g., pdf
        document.documentId = '1';
        envelope.documents = [document];

        // Add a recipient
        const signer = new docusign.Signer();
        signer.email = email;
        signer.name = name;
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
        viewRequest.returnUrl = REDIRECT_URI!;
        viewRequest.authenticationMethod = 'email';
        viewRequest.email = email;
        viewRequest.userName = name;
        viewRequest.clientUserId = '1000';

        const recipientView = await envelopesApi.createRecipientView('account_id', envelopeId, { recipientViewRequest: viewRequest });
        res.json({ url: recipientView.url });

        // Clean up the temporary file
        fs.unlinkSync(req.file.path);
        return res.json({ url: recipientView.url });
    } catch (error) {
        console.error("Error in create-envelope:", error);
        return res.status(500).send((error as any).message);

    }
});

exports.api = functions.https.onRequest(app);
