const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true pour 465, false pour autres ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Vérifier la connexion
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Erreur configuration email:', error);
  } else {
    console.log('✅ Serveur email prêt');
  }
});

// Générer un code à 6 chiffres
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Envoyer un code de vérification
const sendVerificationCode = async (email, code) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Code de vérification - Gestion Entretiens',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .code-box {
            background: #f0f0f0;
            border: 2px dashed #667eea;
            padding: 20px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #667eea;
            margin: 20px 0;
            border-radius: 8px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #999;
            font-size: 12px;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Gestion des Entretiens</h1>
            <p>Code de vérification</p>
          </div>
          <div class="content">
            <h2>Bienvenue !</h2>
            <p>Votre code de vérification pour créer votre compte :</p>
            
            <div class="code-box">
              ${code}
            </div>
            
            <p>Ce code est valide pendant <strong>10 minutes</strong>.</p>
            
            <div class="warning">
              <strong>⚠️ Important :</strong> Si vous n'avez pas demandé ce code, ignorez cet email.
            </div>
            
            <p>Pour toute question, contactez votre administrateur système.</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            <p>&copy; ${new Date().getFullYear()} Gestion Entretiens. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Code de vérification envoyé à ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return false;
  }
};

// Envoyer email de bienvenue après inscription
const sendWelcomeEmail = async (email, nom) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Bienvenue sur Gestion Entretiens !',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 20px 0;
          }
          .features {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
          }
          .features li {
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bienvenue ${nom} !</h1>
          </div>
          <div class="content">
            <p>Votre compte manager a été créé avec succès !</p>
            
            <p>Vous pouvez maintenant accéder à votre espace de gestion des entretiens.</p>
            
            <div class="features">
              <h3>Ce que vous pouvez faire :</h3>
              <ul>
                <li>📋 Gérer votre équipe</li>
                <li>📅 Planifier des entretiens annuels et bimestriels</li>
                <li>📝 Prendre des notes avant, pendant et après les entretiens</li>
                <li>📊 Suivre l'historique des entretiens</li>
                <li>📄 Exporter vos rapports</li>
              </ul>
            </div>
            
            <p style="text-align: center;">
              <a href="http://localhost:3000" class="button">Accéder à mon espace</a>
            </p>
            
            <p>Bon travail !</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de bienvenue envoyé à ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi email bienvenue:', error);
    return false;
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationCode,
  sendWelcomeEmail
};