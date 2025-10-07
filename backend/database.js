const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'gestion_entretiens',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Modèle pour les codes de vérification
const VerificationCode = sequelize.define('VerificationCode', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(6),
    allowNull: false
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  mot_de_passe_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  departement: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'verification_codes',
  timestamps: true
});

// Modèle Manager
const Manager = sequelize.define('Manager', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  mot_de_passe: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  departement: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'managers',
  timestamps: true
});

// Modèle Employé
const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  poste: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  date_embauche: {
    type: DataTypes.DATE,
    allowNull: false
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Manager,
      key: 'id'
    }
  }
}, {
  tableName: 'employees',
  timestamps: true
});

// Modèle Template d'entretien
const Template = sequelize.define('Template', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('annuel', 'bimestriel'),
    allowNull: false
  },
  structure: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Structure JSON du template (sections, questions, etc.)'
  }
}, {
  tableName: 'templates',
  timestamps: true
});

// Modèle Entretien
const Entretien = sequelize.define('Entretien', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Employee,
      key: 'id'
    }
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Manager,
      key: 'id'
    }
  },
  template_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Template,
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('annuel', 'bimestriel'),
    allowNull: false
  },
  date_prevue: {
    type: DataTypes.DATE,
    allowNull: false
  },
  date_realise: {
    type: DataTypes.DATE,
    allowNull: true
  },
  statut: {
    type: DataTypes.ENUM('planifie', 'en_preparation', 'realise', 'reporte'),
    defaultValue: 'planifie',
    allowNull: false
  },
  titre: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  objectifs: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'entretiens',
  timestamps: true
});

// Modèle Notes
const Note = sequelize.define('Note', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entretien_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Entretien,
      key: 'id'
    }
  },
  section: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Section du template (ex: "Objectifs", "Performance", etc.)'
  },
  contenu: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('preparation', 'temps_reel', 'conclusion'),
    defaultValue: 'preparation',
    allowNull: false
  }
}, {
  tableName: 'notes',
  timestamps: true
});

// Modèle ObjectifTemplate - Bibliothèque d'objectifs partagés
const ObjectifTemplate = sequelize.define('ObjectifTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titre: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  categorie: {
    type: DataTypes.ENUM('competences', 'performance', 'developpement', 'projets', 'comportemental', 'autre'),
    allowNull: false,
    defaultValue: 'autre'
  },
  est_actif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Permet de désactiver un objectif sans le supprimer'
  }
}, {
  tableName: 'objectifs_templates',
  timestamps: true
});

// Modèle ObjectifAssigne - Objectifs assignés aux employés
const ObjectifAssigne = sequelize.define('ObjectifAssigne', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  objectif_template_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ObjectifTemplate,
      key: 'id'
    }
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Employee,
      key: 'id'
    }
  },
  entretien_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Entretien,
      key: 'id'
    },
    comment: 'Entretien durant lequel l\'objectif a été assigné'
  },
  priorite: {
    type: DataTypes.ENUM('basse', 'moyenne', 'haute'),
    defaultValue: 'moyenne',
    allowNull: false
  },
  date_assignation: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  date_echeance: {
    type: DataTypes.DATE,
    allowNull: true
  },
  statut: {
    type: DataTypes.ENUM('en_cours', 'atteint', 'non_atteint', 'reporte', 'abandonne'),
    defaultValue: 'en_cours',
    allowNull: false
  },
  progres: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Pourcentage de progression (0-100)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes spécifiques à cette assignation'
  }
}, {
  tableName: 'objectifs_assignes',
  timestamps: true
});

// Associations
Manager.hasMany(Employee, { foreignKey: 'manager_id', as: 'employees' });
Employee.belongsTo(Manager, { foreignKey: 'manager_id', as: 'manager' });

Employee.hasMany(Entretien, { foreignKey: 'employee_id', as: 'entretiens' });
Entretien.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

Manager.hasMany(Entretien, { foreignKey: 'manager_id', as: 'entretiens' });
Entretien.belongsTo(Manager, { foreignKey: 'manager_id', as: 'manager' });

Template.hasMany(Entretien, { foreignKey: 'template_id', as: 'entretiens' });
Entretien.belongsTo(Template, { foreignKey: 'template_id', as: 'template' });

Entretien.hasMany(Note, { foreignKey: 'entretien_id', as: 'notes' });
Note.belongsTo(Entretien, { foreignKey: 'entretien_id', as: 'entretien' });

// Associations Objectifs
ObjectifTemplate.hasMany(ObjectifAssigne, { foreignKey: 'objectif_template_id', as: 'assignations' });
ObjectifAssigne.belongsTo(ObjectifTemplate, { foreignKey: 'objectif_template_id', as: 'objectifTemplate' });

Employee.hasMany(ObjectifAssigne, { foreignKey: 'employee_id', as: 'objectifsAssignes' });
ObjectifAssigne.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

Entretien.hasMany(ObjectifAssigne, { foreignKey: 'entretien_id', as: 'objectifsAssignes' });
ObjectifAssigne.belongsTo(Entretien, { foreignKey: 'entretien_id', as: 'entretien' });

// Test de connexion et synchronisation
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à MySQL réussie !');
    
    await sequelize.sync({ force: false });
    console.log('✅ Tables créées/synchronisées !');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à MySQL:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  Manager,
  Employee,
  Template,
  Entretien,
  Note,
  ObjectifTemplate,
  ObjectifAssigne,
  VerificationCode,
  connectDB
};