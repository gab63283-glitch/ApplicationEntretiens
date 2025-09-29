const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { Manager, Employee, Template, Entretien, Note, connectDB } = require('./database');

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

// Route pour récupérer les infos du manager connecté
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

// Fonction pour créer des données de test
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

      console.log('✅ Données de test créées !');
      console.log('📧 Email de connexion: marie.dubois@entreprise.com, pierre.martin@entreprise.com, sophie.bernard@entreprise.com');
      console.log('🔑 Mot de passe: password123');
    }
  } catch (error) {
    console.error('Erreur création données de test:', error);
  }
};

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API Gestion Entretiens - Prête !' });
});

// Démarrage du serveur
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
    });

  } catch (error) {
    console.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
};

startServer();