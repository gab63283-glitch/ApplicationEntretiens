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

// Test de connexion et synchronisation
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à MySQL réussie !');
    
    await sequelize.sync({ force: false }); // force: true pour recréer les tables
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
  connectDB
};