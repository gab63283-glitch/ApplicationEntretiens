import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ObjectifsLibrary.css';

const API_URL = 'http://localhost:3002/api';

const CATEGORIES = {
  'competences': { label: 'Compétences', icon: '🎯', color: '#2196F3' },
  'performance': { label: 'Performance', icon: '📈', color: '#4CAF50' },
  'developpement': { label: 'Développement', icon: '🌱', color: '#FF9800' },
  'projets': { label: 'Projets', icon: '📋', color: '#9C27B0' },
  'comportemental': { label: 'Comportemental', icon: '🤝', color: '#00BCD4' },
  'autre': { label: 'Autre', icon: '📌', color: '#607D8B' }
};

function ObjectifsLibrary() {
  const [objectifs, setObjectifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingObjectif, setEditingObjectif] = useState(null);
  const [filterCategorie, setFilterCategorie] = useState('all');
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    categorie: 'competences'
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadObjectifs();
  }, []);

  const loadObjectifs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/objectifs-templates`);
      setObjectifs(response.data);
    } catch (error) {
      console.error('Erreur chargement objectifs:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingObjectif) {
        const response = await axios.put(`${API_URL}/objectifs-templates/${editingObjectif.id}`, {
          ...formData,
          est_actif: true
        });
        setObjectifs(objectifs.map(obj => obj.id === editingObjectif.id ? response.data : obj));
        alert('Objectif modifié avec succès');
      } else {
        const response = await axios.post(`${API_URL}/objectifs-templates`, formData);
        setObjectifs([...objectifs, response.data]);
        alert('Objectif ajouté à la bibliothèque');
      }

      resetForm();
    } catch (error) {
      console.error('Erreur sauvegarde objectif:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (objectif) => {
    setEditingObjectif(objectif);
    setFormData({
      titre: objectif.titre,
      description: objectif.description || '',
      categorie: objectif.categorie
    });
    setShowAddForm(true);
  };

  const handleDelete = async (objectifId) => {
    if (!window.confirm('Désactiver cet objectif ? Il ne sera plus disponible pour de nouvelles assignations.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/objectifs-templates/${objectifId}`);
      setObjectifs(objectifs.filter(obj => obj.id !== objectifId));
      alert('Objectif désactivé avec succès');
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingObjectif(null);
    setFormData({
      titre: '',
      description: '',
      categorie: 'competences'
    });
  };

  const filteredObjectifs = filterCategorie === 'all' 
    ? objectifs 
    : objectifs.filter(obj => obj.categorie === filterCategorie);

  const objectifsByCategorie = Object.keys(CATEGORIES).reduce((acc, cat) => {
    acc[cat] = filteredObjectifs.filter(obj => obj.categorie === cat);
    return acc;
  }, {});

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="objectifs-library-page">
      <header className="library-header">
        <div className="header-left">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Retour
          </button>
          <div className="header-info">
            <h1>📚 Bibliothèque d'Objectifs</h1>
            <p>Objectifs partagés réutilisables pour tous les entretiens</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="add-objectif-btn"
        >
          {showAddForm ? '❌ Annuler' : '➕ Créer un objectif'}
        </button>
      </header>

      <div className="library-stats">
        <div className="stat">
          <span className="stat-number">{objectifs.length}</span>
          <span className="stat-label">Objectifs disponibles</span>
        </div>
        {Object.entries(CATEGORIES).map(([key, val]) => {
          const count = objectifs.filter(o => o.categorie === key).length;
          return count > 0 ? (
            <div key={key} className="stat" style={{ borderTopColor: val.color }}>
              <span className="stat-number">{count}</span>
              <span className="stat-label">{val.icon} {val.label}</span>
            </div>
          ) : null;
        })}
      </div>

      {showAddForm && (
        <div className="form-section">
          <h3>{editingObjectif ? '✏️ Modifier l\'objectif' : '➕ Créer un nouvel objectif'}</h3>
          <form onSubmit={handleSubmit} className="objectif-form">
            <div className="form-row">
              <div className="form-group full">
                <label>Titre de l'objectif *</label>
                <input
                  type="text"
                  value={formData.titre}
                  onChange={(e) => setFormData({...formData, titre: e.target.value})}
                  placeholder="Ex: Améliorer les compétences en gestion de projet"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Catégorie *</label>
                <select
                  value={formData.categorie}
                  onChange={(e) => setFormData({...formData, categorie: e.target.value})}
                  required
                >
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.icon} {val.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Détails et contexte de l'objectif..."
                  rows="4"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn">
                {editingObjectif ? '💾 Sauvegarder' : '➕ Créer'}
              </button>
              <button type="button" onClick={resetForm} className="cancel-btn">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filters">
        <button 
          className={`filter-btn ${filterCategorie === 'all' ? 'active' : ''}`}
          onClick={() => setFilterCategorie('all')}
        >
          Tous ({objectifs.length})
        </button>
        {Object.entries(CATEGORIES).map(([key, val]) => {
          const count = objectifs.filter(o => o.categorie === key).length;
          return count > 0 ? (
            <button
              key={key}
              className={`filter-btn ${filterCategorie === key ? 'active' : ''}`}
              onClick={() => setFilterCategorie(key)}
              style={{ borderColor: val.color }}
            >
              {val.icon} {val.label} ({count})
            </button>
          ) : null;
        })}
      </div>

      <div className="objectifs-container">
        {filteredObjectifs.length === 0 ? (
          <div className="empty-state">
            <p>Aucun objectif dans cette catégorie</p>
            <button onClick={() => setShowAddForm(true)} className="add-first-btn">
              Créer le premier objectif
            </button>
          </div>
        ) : (
          filterCategorie === 'all' ? (
            Object.entries(objectifsByCategorie).map(([cat, objs]) => 
              objs.length > 0 && (
                <div key={cat} className="categorie-section">
                  <h3 className="categorie-title" style={{ borderLeftColor: CATEGORIES[cat].color }}>
                    {CATEGORIES[cat].icon} {CATEGORIES[cat].label} ({objs.length})
                  </h3>
                  <div className="objectifs-grid">
                    {objs.map(obj => (
                      <ObjectifCard 
                        key={obj.id} 
                        objectif={obj} 
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        categorie={CATEGORIES[cat]}
                      />
                    ))}
                  </div>
                </div>
              )
            )
          ) : (
            <div className="objectifs-grid">
              {filteredObjectifs.map(obj => (
                <ObjectifCard 
                  key={obj.id} 
                  objectif={obj} 
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  categorie={CATEGORIES[obj.categorie]}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ObjectifCard({ objectif, onEdit, onDelete, categorie }) {
  return (
    <div className="objectif-tag">
      <div className="tag-header">
        <span className="tag-icon" style={{ backgroundColor: categorie.color }}>
          {categorie.icon}
        </span>
        <div className="tag-actions">
          <button onClick={() => onEdit(objectif)} className="edit-btn" title="Modifier">
            ✏️
          </button>
          <button onClick={() => onDelete(objectif.id)} className="delete-btn" title="Désactiver">
            🗑️
          </button>
        </div>
      </div>

      <h4 className="tag-title">{objectif.titre}</h4>

      {objectif.description && (
        <p className="tag-description">{objectif.description}</p>
      )}

      <div className="tag-footer">
        <span className="tag-categorie" style={{ color: categorie.color }}>
          {categorie.label}
        </span>
      </div>
    </div>
  );
}

export default ObjectifsLibrary;