const { google } = require('googleapis');
const path = require('path');
const MailComposer = require('nodemailer/lib/mail-composer');
const token = require('./tokens.json');

// Configure OAuth2 client
const credentials = require('./credentials.json');
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Specify Gmail API scope
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

// Function to authenticate and authorize the application
async function authorize() {
  try {
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  } catch (error) {
    console.log('Error retrieving access token:', error);
  }
}

const createMail = async (options) => {
  const mailComposer = new MailComposer(options);
  const message = await mailComposer.compile().build();
    // Create GmailMessage resource
    // const gmailMessage = {
    //   raw: encodeMessage(message),
    //   labelIds: ['Label_5'] // Add the label ID here
    // };
  
    // return gmailMessage;
    return encodeMessage(message)
};

const encodeMessage = (message) => {
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const getGmailService = () => {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  oAuth2Client.setCredentials(token);
  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  return gmail;
};

// Function to check for new emails and send replies
async function handleEmails() {
  try {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const response = await gmail.users.messages.list({ userId: 'me' });
    const emails = response.data.messages;
    // console.log(emails)

    let count = 0;
    emails.forEach(async (email) => {
      ++count;
      if (count < 10) {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: email.id,
        });
        //   console.log(msg.data.snippet)

        const threadId = msg.data.threadId;
        const thread = await gmail.users.threads.get({
          userId: 'me',
          id: threadId,
        });

        //   console.log(thread.data.messages)
        let isSent = false;
        // Check if email thread has no prior replies
        if (thread.data.messages.length === 1) {
          // Send reply

          const headers = msg.data.payload.headers;
          let recipientEmail = '';
          for (const header of headers) {
            if (header.name === 'From') {
              recipientEmail = header.value;
              // console.log(recipientEmail)
              break;
            }
          }

          // console.log(msg.data.payload.headers)

          const fileAttachments = [
            {
              path: path.join(__dirname, './attachment2.txt'),
            },
          ];

          const options = {
            to: recipientEmail,
            // cc: 'cc1@example.com, cc2@example.com',
            replyTo: recipientEmail,
            subject: 'Response to mail!',
            text: 'This email is sent from the command line',
            html: `<p>🙋🏻‍♀️  &mdash; This is a <b>response</b> from warlock.</p>`,
            attachments: fileAttachments,
            textEncoding: 'base64',
            headers: [
              { key: 'X-Application-Developer', value: 'Amit Agarwal' },
              { key: 'X-Application-Version', value: 'v1.0.0.2' },
            ],
          };
          const mail = getGmailService();
          const rawMessage = await createMail(options);

          await gmail.users.messages.send({
            userId: 'me',
            resource: {
              raw: rawMessage,
            },
          });

          // Add label to the email
          // const service = google.gmail({ version: 'v1', auth : oAuth2Client});
          // service.users.labels.list({ userId: 'me' }, (err, res) => {
          //   if (err) {
          //     console.error('Error retrieving labels:', err);
          //     return;
          //   }

          //   const labels = res.data.labels;
          //   console.log(labels)
          //   if (!labels || labels.length === 0) {
          //     console.log('No labels found.');
          //   } else {
          //     console.log('Labels:');
          //     labels.forEach((label) => {
          //       console.log(label.name + ' ' + label.id);
          //     });
          //   }
          // });

          const labelId = 'Label_5';
          await gmail.users.messages.modify({
            userId: 'me',
            id: email.id,
            requestBody: {
              addLabelIds: [labelId],
              labelListVisibility: 'labelShow',
              messageListVisibility: 'show',
              // name: "Sent"
            },
          });
          // console.log(id);
        }
      }
    });
  } catch (error) {
    console.log('Error handling emails:', error);
  }
}

// Main function
async function main() {
  const auth = await authorize();
  //   setInterval(handleEmails, Math.floor(Math.random() * (120000 - 45000 + 1)) + 45000);
  await handleEmails();
  //   console.log(emails)
}

// Run the application
main();
