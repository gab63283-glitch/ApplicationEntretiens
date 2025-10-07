const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { Manager, Employee, Template, Entretien, Note, ObjectifTemplate, ObjectifAssigne, VerificationCode, connectDB } = require('./database');
const { generateVerificationCode, sendVerificationCode, sendWelcomeEmail } = require('./emailService');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, manager) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.manager = manager;
    next();
  });
};

// Routes d'authentification
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const manager = await Manager.findOne({ where: { email } });
    
    if (!manager) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const validPassword = await bcrypt.compare(mot_de_passe, manager.mot_de_passe);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: manager.id, email: manager.email, nom: manager.nom },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      manager: {
        id: manager.id,
        nom: manager.nom,
        email: manager.email,
        departement: manager.departement
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/request-code', async (req, res) => {
  try {
    const { email, nom, mot_de_passe, departement } = req.body;

    if (!email || !nom || !mot_de_passe) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const existingManager = await Manager.findOne({ where: { email } });
    if (existingManager) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format d\'email invalide' });
    }

    if (mot_de_passe.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    const code = generateVerificationCode();
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await VerificationCode.destroy({ where: { email, verified: false } });

    await VerificationCode.create({
      email,
      code,
      nom,
      mot_de_passe_hash: hashedPassword,
      departement: departement || null,
      expires_at: expiresAt,
      verified: false
    });

    const emailSent = await sendVerificationCode(email, code);

    if (!emailSent) {
      return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
    }

    res.json({ 
      message: 'Code de vérification envoyé par email',
      email: email
    });

  } catch (error) {
    console.error('Erreur demande code:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email et code requis' });
    }

    const verificationRecord = await VerificationCode.findOne({
      where: { 
        email, 
        code,
        verified: false
      }
    });

    if (!verificationRecord) {
      return res.status(400).json({ error: 'Code invalide ou déjà utilisé' });
    }

    if (new Date() > new Date(verificationRecord.expires_at)) {
      await verificationRecord.destroy();
      return res.status(400).json({ error: 'Code expiré, veuillez en demander un nouveau' });
    }

    const newManager = await Manager.create({
      nom: verificationRecord.nom,
      email: verificationRecord.email,
      mot_de_passe: verificationRecord.mot_de_passe_hash,
      departement: verificationRecord.departement
    });

    await verificationRecord.update({ verified: true });
    await verificationRecord.destroy();

    await sendWelcomeEmail(newManager.email, newManager.nom);

    const token = jwt.sign(
      { id: newManager.id, email: newManager.email, nom: newManager.nom },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      message: 'Compte créé avec succès !',
      token,
      manager: {
        id: newManager.id,
        nom: newManager.nom,
        email: newManager.email,
        departement: newManager.departement
      }
    });

  } catch (error) {
    console.error('Erreur vérification code:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const manager = await Manager.findByPk(req.manager.id, {
      attributes: ['id', 'nom', 'email', 'departement']
    });
    res.json(manager);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les employés
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: { manager_id: req.manager.id },
      order: [['nom', 'ASC']]
    });
    res.json(employees);
  } catch (error) {
    console.error('Erreur récupération employés:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/employees', authenticateToken, async (req, res) => {
  try {
    const { nom, email, poste, date_embauche } = req.body;
    
    const newEmployee = await Employee.create({
      nom,
      email,
      poste,
      date_embauche,
      manager_id: req.manager.id
    });
    
    res.status(201).json(newEmployee);
  } catch (error) {
    console.error('Erreur création employé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const { nom, email, poste, date_embauche } = req.body;
    const employeeId = req.params.id;

    const [updatedRows] = await Employee.update(
      { nom, email, poste, date_embauche },
      { 
        where: { 
          id: employeeId,
          manager_id: req.manager.id
        } 
      }
    );

    if (updatedRows > 0) {
      const updatedEmployee = await Employee.findByPk(employeeId);
      res.json(updatedEmployee);
    } else {
      res.status(404).json({ error: 'Employé non trouvé' });
    }
  } catch (error) {
    console.error('Erreur modification employé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/employees/:id', authenticateToken, async (req, res) => {
  try {
    const deletedRows = await Employee.destroy({
      where: { 
        id: req.params.id,
        manager_id: req.manager.id
      }
    });

    if (deletedRows > 0) {
      res.json({ message: 'Employé supprimé avec succès' });
    } else {
      res.status(404).json({ error: 'Employé non trouvé' });
    }
  } catch (error) {
    console.error('Erreur suppression employé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les entretiens
app.get('/api/entretiens', authenticateToken, async (req, res) => {
  try {
    const entretiens = await Entretien.findAll({
      where: { manager_id: req.manager.id },
      include: [
        { model: Employee, as: 'employee', attributes: ['nom', 'email', 'poste'] },
        { model: Template, as: 'template', attributes: ['nom', 'type'] }
      ],
      order: [['date_prevue', 'DESC']]
    });
    res.json(entretiens);
  } catch (error) {
    console.error('Erreur récupération entretiens:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/entretiens/:id', authenticateToken, async (req, res) => {
  try {
    const entretien = await Entretien.findOne({
      where: { 
        id: req.params.id,
        manager_id: req.manager.id
      },
      include: [
        { model: Employee, as: 'employee' },
        { model: Template, as: 'template' }
      ]
    });

    if (entretien) {
      res.json(entretien);
    } else {
      res.status(404).json({ error: 'Entretien non trouvé' });
    }
  } catch (error) {
    console.error('Erreur récupération entretien:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/entretiens', authenticateToken, async (req, res) => {
  try {
    const { employee_id, template_id, type, date_prevue, titre, objectifs } = req.body;
    
    const newEntretien = await Entretien.create({
      employee_id,
      manager_id: req.manager.id,
      template_id,
      type,
      date_prevue,
      titre,
      objectifs,
      statut: 'planifie'
    });
    
    res.status(201).json(newEntretien);
  } catch (error) {
    console.error('Erreur création entretien:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/entretiens/:id', authenticateToken, async (req, res) => {
  try {
    const { statut, titre, objectifs, date_prevue, date_realise } = req.body;
    const entretienId = req.params.id;

    const [updatedRows] = await Entretien.update(
      { statut, titre, objectifs, date_prevue, date_realise },
      { 
        where: { 
          id: entretienId,
          manager_id: req.manager.id
        } 
      }
    );

    if (updatedRows > 0) {
      const updatedEntretien = await Entretien.findByPk(entretienId, {
        include: [
          { model: Employee, as: 'employee' },
          { model: Template, as: 'template' }
        ]
      });
      res.json(updatedEntretien);
    } else {
      res.status(404).json({ error: 'Entretien non trouvé' });
    }
  } catch (error) {
    console.error('Erreur modification entretien:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/entretiens/:id', authenticateToken, async (req, res) => {
  try {
    const deletedRows = await Entretien.destroy({
      where: { 
        id: req.params.id,
        manager_id: req.manager.id
      }
    });

    if (deletedRows > 0) {
      res.json({ message: 'Entretien supprimé avec succès' });
    } else {
      res.status(404).json({ error: 'Entretien non trouvé' });
    }
  } catch (error) {
    console.error('Erreur suppression entretien:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les notes
app.get('/api/entretiens/:id/notes', authenticateToken, async (req, res) => {
  try {
    const entretienId = req.params.id;
    
    const entretien = await Entretien.findOne({
      where: { 
        id: entretienId,
        manager_id: req.manager.id
      }
    });

    if (!entretien) {
      return res.status(404).json({ error: 'Entretien non trouvé' });
    }

    const notes = await Note.findAll({
      where: { entretien_id: entretienId },
      order: [['createdAt', 'ASC']]
    });

    res.json(notes);
  } catch (error) {
    console.error('Erreur récupération notes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/entretiens/:id/notes', authenticateToken, async (req, res) => {
  try {
    const entretienId = req.params.id;
    const { section, contenu, type } = req.body;

    const entretien = await Entretien.findOne({
      where: { 
        id: entretienId,
        manager_id: req.manager.id
      }
    });

    if (!entretien) {
      return res.status(404).json({ error: 'Entretien non trouvé' });
    }

    const newNote = await Note.create({
      entretien_id: entretienId,
      section,
      contenu,
      type
    });

    res.status(201).json(newNote);
  } catch (error) {
    console.error('Erreur création note:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;
    const { contenu } = req.body;

    const note = await Note.findOne({
      where: { id: noteId },
      include: [{
        model: Entretien,
        as: 'entretien',
        where: { manager_id: req.manager.id }
      }]
    });

    if (!note) {
      return res.status(404).json({ error: 'Note non trouvée' });
    }

    await note.update({ contenu });
    res.json(note);
  } catch (error) {
    console.error('Erreur modification note:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;

    const note = await Note.findOne({
      where: { id: noteId },
      include: [{
        model: Entretien,
        as: 'entretien',
        where: { manager_id: req.manager.id }
      }]
    });

    if (!note) {
      return res.status(404).json({ error: 'Note non trouvée' });
    }

    await note.destroy();
    res.json({ message: 'Note supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression note:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===== ROUTES POUR LA BIBLIOTHÈQUE D'OBJECTIFS (Templates) =====

// GET - Récupérer tous les objectifs templates (bibliothèque partagée)
app.get('/api/objectifs-templates', authenticateToken, async (req, res) => {
  try {
    const objectifs = await ObjectifTemplate.findAll({
      where: { est_actif: true },
      order: [['categorie', 'ASC'], ['titre', 'ASC']]
    });
    res.json(objectifs);
  } catch (error) {
    console.error('Erreur récupération objectifs templates:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Créer un nouvel objectif template
app.post('/api/objectifs-templates', authenticateToken, async (req, res) => {
  try {
    const { titre, description, categorie } = req.body;

    if (!titre || !categorie) {
      return res.status(400).json({ error: 'Titre et catégorie requis' });
    }

    const newObjectif = await ObjectifTemplate.create({
      titre,
      description,
      categorie,
      est_actif: true
    });

    res.status(201).json(newObjectif);
  } catch (error) {
    console.error('Erreur création objectif template:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT - Modifier un objectif template
app.put('/api/objectifs-templates/:id', authenticateToken, async (req, res) => {
  try {
    const { titre, description, categorie, est_actif } = req.body;
    const objectifId = req.params.id;

    const [updatedRows] = await ObjectifTemplate.update(
      { titre, description, categorie, est_actif },
      { where: { id: objectifId } }
    );

    if (updatedRows > 0) {
      const updatedObjectif = await ObjectifTemplate.findByPk(objectifId);
      res.json(updatedObjectif);
    } else {
      res.status(404).json({ error: 'Objectif non trouvé' });
    }
  } catch (error) {
    console.error('Erreur modification objectif template:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE - Désactiver un objectif template (soft delete)
app.delete('/api/objectifs-templates/:id', authenticateToken, async (req, res) => {
  try {
    const objectifId = req.params.id;

    const [updatedRows] = await ObjectifTemplate.update(
      { est_actif: false },
      { where: { id: objectifId } }
    );

    if (updatedRows > 0) {
      res.json({ message: 'Objectif désactivé avec succès' });
    } else {
      res.status(404).json({ error: 'Objectif non trouvé' });
    }
  } catch (error) {
    console.error('Erreur suppression objectif template:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===== ROUTES POUR LES OBJECTIFS ASSIGNÉS =====

// GET - Récupérer les objectifs assignés à un employé
app.get('/api/employees/:id/objectifs', authenticateToken, async (req, res) => {
  try {
    const employeeId = req.params.id;

    const employee = await Employee.findOne({
      where: { 
        id: employeeId,
        manager_id: req.manager.id
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    const objectifs = await ObjectifAssigne.findAll({
      where: { employee_id: employeeId },
      include: [
        { model: ObjectifTemplate, as: 'objectifTemplate' },
        { model: Entretien, as: 'entretien', attributes: ['titre', 'date_prevue', 'type'] }
      ],
      order: [['date_assignation', 'DESC']]
    });

    res.json(objectifs);
  } catch (error) {
    console.error('Erreur récupération objectifs employé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Récupérer les objectifs assignés lors d'un entretien
app.get('/api/entretiens/:id/objectifs-assignes', authenticateToken, async (req, res) => {
  try {
    const entretienId = req.params.id;

    const entretien = await Entretien.findOne({
      where: { 
        id: entretienId,
        manager_id: req.manager.id
      }
    });

    if (!entretien) {
      return res.status(404).json({ error: 'Entretien non trouvé' });
    }

    const objectifs = await ObjectifAssigne.findAll({
      where: { entretien_id: entretienId },
      include: [
        { model: ObjectifTemplate, as: 'objectifTemplate' },
        { model: Employee, as: 'employee', attributes: ['nom'] }
      ],
      order: [['date_assignation', 'DESC']]
    });

    res.json(objectifs);
  } catch (error) {
    console.error('Erreur récupération objectifs entretien:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Assigner un objectif à un employé (durant un entretien ou non)
app.post('/api/objectifs-assignes', authenticateToken, async (req, res) => {
  try {
    const { objectif_template_id, employee_id, entretien_id, priorite, date_echeance, notes } = req.body;

    if (!objectif_template_id || !employee_id) {
      return res.status(400).json({ error: 'Objectif template et employé requis' });
    }

    // Vérifier que l'employé appartient au manager
    const employee = await Employee.findOne({
      where: { 
        id: employee_id,
        manager_id: req.manager.id
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }

    // Si un entretien est spécifié, vérifier qu'il appartient au manager
    if (entretien_id) {
      const entretien = await Entretien.findOne({
        where: { 
          id: entretien_id,
          manager_id: req.manager.id
        }
      });

      if (!entretien) {
        return res.status(404).json({ error: 'Entretien non trouvé' });
      }
    }

    const newAssignation = await ObjectifAssigne.create({
      objectif_template_id,
      employee_id,
      entretien_id: entretien_id || null,
      priorite: priorite || 'moyenne',
      date_assignation: new Date(),
      date_echeance: date_echeance || null,
      statut: 'en_cours',
      progres: 0,
      notes: notes || null
    });

    const assignation = await ObjectifAssigne.findByPk(newAssignation.id, {
      include: [
        { model: ObjectifTemplate, as: 'objectifTemplate' },
        { model: Employee, as: 'employee' }
      ]
    });

    res.status(201).json(assignation);
  } catch (error) {
    console.error('Erreur assignation objectif:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT - Mettre à jour une assignation d'objectif
app.put('/api/objectifs-assignes/:id', authenticateToken, async (req, res) => {
  try {
    const assignationId = req.params.id;
    const { priorite, date_echeance, statut, progres, notes } = req.body;

    const assignation = await ObjectifAssigne.findOne({
      where: { id: assignationId },
      include: [{
        model: Employee,
        as: 'employee',
        where: { manager_id: req.manager.id }
      }]
    });

    if (!assignation) {
      return res.status(404).json({ error: 'Assignation non trouvée' });
    }

    await assignation.update({
      priorite,
      date_echeance,
      statut,
      progres: Math.min(100, Math.max(0, progres || 0)),
      notes
    });

    const updatedAssignation = await ObjectifAssigne.findByPk(assignationId, {
      include: [
        { model: ObjectifTemplate, as: 'objectifTemplate' },
        { model: Employee, as: 'employee' }
      ]
    });

    res.json(updatedAssignation);
  } catch (error) {
    console.error('Erreur modification assignation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE - Supprimer une assignation d'objectif
app.delete('/api/objectifs-assignes/:id', authenticateToken, async (req, res) => {
  try {
    const assignationId = req.params.id;

    const assignation = await ObjectifAssigne.findOne({
      where: { id: assignationId },
      include: [{
        model: Employee,
        as: 'employee',
        where: { manager_id: req.manager.id }
      }]
    });

    if (!assignation) {
      return res.status(404).json({ error: 'Assignation non trouvée' });
    }

    await assignation.destroy();
    res.json({ message: 'Assignation supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression assignation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Récupérer tous les objectifs assignés (pour le dashboard)
app.get('/api/objectifs-assignes', authenticateToken, async (req, res) => {
  try {
    // Récupérer tous les employés du manager
    const employees = await Employee.findAll({
      where: { manager_id: req.manager.id },
      attributes: ['id']
    });

    const employeeIds = employees.map(e => e.id);

    const objectifs = await ObjectifAssigne.findAll({
      where: { employee_id: employeeIds },
      include: [
        { model: ObjectifTemplate, as: 'objectifTemplate' },
        { model: Employee, as: 'employee', attributes: ['nom', 'poste'] },
        { model: Entretien, as: 'entretien', attributes: ['titre', 'date_prevue'] }
      ],
      order: [['date_assignation', 'DESC']]
    });

    res.json(objectifs);
  } catch (error) {
    console.error('Erreur récupération objectifs assignés:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les templates
app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    const templates = await Template.findAll({
      order: [['type', 'ASC'], ['nom', 'ASC']]
    });
    res.json(templates);
  } catch (error) {
    console.error('Erreur récupération templates:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

const createSampleData = async () => {
  try {
    const managerCount = await Manager.count();
    
    if (managerCount === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const managers = await Manager.bulkCreate([
        {
          nom: 'Marie Dubois',
          email: 'marie.dubois@entreprise.com',
          mot_de_passe: hashedPassword,
          departement: 'Développement'
        },
        {
          nom: 'Pierre Martin',
          email: 'pierre.martin@entreprise.com',
          mot_de_passe: hashedPassword,
          departement: 'Marketing'
        },
        {
          nom: 'Sophie Bernard',
          email: 'sophie.bernard@entreprise.com',
          mot_de_passe: hashedPassword,
          departement: 'RH'
        }
      ]);

      await Employee.bulkCreate([
        { nom: 'Jean Dupont', email: 'jean.dupont@entreprise.com', poste: 'Développeur Senior', date_embauche: '2020-03-15', manager_id: managers[0].id },
        { nom: 'Alice Johnson', email: 'alice.johnson@entreprise.com', poste: 'Développeur Junior', date_embauche: '2022-01-10', manager_id: managers[0].id },
        { nom: 'Bob Wilson', email: 'bob.wilson@entreprise.com', poste: 'Chef de projet Marketing', date_embauche: '2019-06-20', manager_id: managers[1].id },
        { nom: 'Emma Davis', email: 'emma.davis@entreprise.com', poste: 'Assistante Marketing', date_embauche: '2021-11-05', manager_id: managers[1].id },
        { nom: 'Lucas Brown', email: 'lucas.brown@entreprise.com', poste: 'Chargé de recrutement', date_embauche: '2020-09-12', manager_id: managers[2].id }
      ]);

      await Template.bulkCreate([
        {
          nom: 'Entretien Annuel Standard',
          type: 'annuel',
          structure: {
            sections: [
              { nom: 'Bilan de l\'année', questions: ['Quels sont vos principaux accomplissements ?', 'Quelles difficultés avez-vous rencontrées ?'] },
              { nom: 'Objectifs futurs', questions: ['Quels sont vos objectifs pour l\'année prochaine ?', 'Quelles formations souhaitez-vous suivre ?'] },
              { nom: 'Évaluation', questions: ['Auto-évaluation', 'Points forts', 'Axes d\'amélioration'] }
            ]
          }
        },
        {
          nom: 'Entretien Bimestriel',
          type: 'bimestriel',
          structure: {
            sections: [
              { nom: 'Suivi des objectifs', questions: ['Avancement des projets en cours', 'Difficultés rencontrées'] },
              { nom: 'Besoins et support', questions: ['De quoi avez-vous besoin ?', 'Comment puis-je vous aider ?'] }
            ]
          }
        }
      ]);

      // Créer des objectifs templates partagés
      await ObjectifTemplate.bulkCreate([
        {
          titre: 'Améliorer les compétences techniques',
          description: 'Développer et renforcer les compétences techniques dans son domaine',
          categorie: 'competences',
          est_actif: true
        },
        {
          titre: 'Augmenter la productivité',
          description: 'Optimiser l\'organisation et augmenter l\'efficacité au travail',
          categorie: 'performance',
          est_actif: true
        },
        {
          titre: 'Suivre une formation certifiante',
          description: 'Obtenir une certification professionnelle reconnue',
          categorie: 'developpement',
          est_actif: true
        },
        {
          titre: 'Mener un projet stratégique',
          description: 'Prendre en charge et finaliser un projet important',
          categorie: 'projets',
          est_actif: true
        },
        {
          titre: 'Améliorer la communication',
          description: 'Renforcer les compétences de communication interpersonnelle',
          categorie: 'comportemental',
          est_actif: true
        },
        {
          titre: 'Mentorat d\'un junior',
          description: 'Accompagner et former un collaborateur junior',
          categorie: 'developpement',
          est_actif: true
        },
        {
          titre: 'Optimiser les processus',
          description: 'Identifier et améliorer les processus de travail',
          categorie: 'performance',
          est_actif: true
        },
        {
          titre: 'Développer l\'autonomie',
          description: 'Gagner en autonomie dans la prise de décision',
          categorie: 'comportemental',
          est_actif: true
        }
      ]);

      console.log('✅ Données de test créées !');
      console.log('✅ 8 objectifs templates créés dans la bibliothèque partagée !');
      console.log('📧 Email de connexion: marie.dubois@entreprise.com, pierre.martin@entreprise.com, sophie.bernard@entreprise.com');
      console.log('🔑 Mot de passe: password123');
    }
  } catch (error) {
    console.error('Erreur création données de test:', error);
  }
};

app.get('/', (req, res) => {
  res.json({ message: 'API Gestion Entretiens - Prête !' });
});

const startServer = async () => {
  try {
    const connected = await connectDB();
    
    if (!connected) {
      console.error('❌ Impossible de se connecter à la base de données');
      process.exit(1);
    }

    await createSampleData();

    app.listen(PORT, () => {
      console.log(`🚀 Serveur Gestion Entretiens sur http://localhost:${PORT}`);
      console.log('📊 Base de données MySQL connectée');
      console.log('🔐 Authentification JWT activée');
      console.log('🎯 Système d\'objectifs partagés actif');
    });

  } catch (error) {
    console.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
};

startServer();