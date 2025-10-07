import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './EntretienObjectifs.css';

const API_URL = 'http://localhost:3002/api';

const CATEGORIES = {
  'competences': { label: 'Compétences', icon: '🎯', color: '#2196F3' },
  'performance': { label: 'Performance', icon: '📈', color: '#4CAF50' },
  'developpement': { label: 'Développement', icon: '🌱', color: '#FF9800' },
  'projets': { label: 'Projets', icon: '📋', color: '#9C27B0' },
  'comportemental': { label: 'Comportemental', icon: '🤝', color: '#00BCD4' },
  'autre': { label: 'Autre', icon: '📌', color: '#607D8B' }
};

const PRIORITES = {
  'basse': { label: 'Basse', color: '#9E9E9E' },
  'moyenne': { label: 'Moyenne', color: '#FF9800' },
  'haute': { label: 'Haute', color: '#f44336' }
};

const STATUTS = {
  'en_cours': { label: 'En cours', icon: '⏳', color: '#2196F3' },
  'atteint': { label: 'Atteint', icon: '✅', color: '#4CAF50' },
  'non_atteint': { label: 'Non atteint', icon: '❌', color: '#f44336' },
  'reporte': { label: 'Reporté', icon: '⏸️', color: '#FF9800' },
  'abandonne': { label: 'Abandonné', icon: '🚫', color: '#607D8B' }
};

function EntretienObjectifs() {
  const { id } = useParams();
  const [entretien, setEntretien] = useState(null);
  const [objectifsTemplates, setObjectifsTemplates] = useState([]);
  const [objectifsAssignes, setObjectifsAssignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAssignation, setEditingAssignation] = useState(null);
  const [filterCategorie, setFilterCategorie] = useState('all');
  const [assignFormData, setAssignFormData] = useState({
    objectif_template_id: '',
    priorite: 'moyenne',
    date_echeance: '',
    notes: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entretienRes, templatesRes, assignesRes] = await Promise.all([
        axios.get(`${API_URL}/entretiens/${id}`),
        axios.get(`${API_URL}/objectifs-templates`),
        axios.get(`${API_URL}/entretiens/${id}/objectifs-assignes`)
      ]);
      
      setEntretien(entretienRes.data);
      setObjectifsTemplates(templatesRes.data);
      setObjectifsAssignes(assignesRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement');
      navigate('/entretiens');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignObjectif = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${API_URL}/objectifs-assignes`, {
        objectif_template_id: parseInt(assignFormData.objectif_template_id),
        employee_id: entretien.employee_id,
        entretien_id: parseInt(id),
        priorite: assignFormData.priorite,
        date_echeance: assignFormData.date_echeance || null,
        notes: assignFormData.notes || null
      });

      setObjectifsAssignes([...objectifsAssignes, response.data]);
      alert('Objectif assigné avec succès !');
      resetAssignForm();
    } catch (error) {
      console.error('Erreur assignation:', error);
      alert('Erreur lors de l\'assignation');
    }
  };

  const handleUpdateAssignation = async (assignationId, updates) => {
    try {
      const response = await axios.put(`${API_URL}/objectifs-assignes/${assignationId}`, updates);
      setObjectifsAssignes(objectifsAssignes.map(obj => 
        obj.id === assignationId ? response.data : obj
      ));
      alert('Objectif mis à jour');
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteAssignation = async (assignationId) => {
    if (!window.confirm('Supprimer cette assignation d\'objectif ?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/objectifs-assignes/${assignationId}`);
      setObjectifsAssignes(objectifsAssignes.filter(obj => obj.id !== assignationId));
      alert('Assignation supprimée');
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetAssignForm = () => {
    setShowAssignModal(false);
    setAssignFormData({
      objectif_template_id: '',
      priorite: 'moyenne',
      date_echeance: '',
      notes: ''
    });
  };

  const filteredTemplates = filterCategorie === 'all' 
    ? objectifsTemplates 
    : objectifsTemplates.filter(obj => obj.categorie === filterCategorie);

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  if (!entretien) {
    return <div className="loading">Entretien introuvable</div>;
  }

  return (
    <div className="entretien-objectifs-page">
      <header className="objectifs-header">
        <div className="header-left">
          <button onClick={() => navigate(`/entretiens/${id}/notes`)} className="back-btn">
            ← Retour aux notes
          </button>
          <div className="header-info">
            <h1>🎯 Objectifs - {entretien.titre}</h1>
            <div className="entretien-meta">
              <span>👤 {entretien.employee?.nom}</span>
              <span>📅 {new Date(entretien.date_prevue).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="objectifs-stats">
        <div className="stat">
          <span className="stat-number">{objectifsAssignes.length}</span>
          <span className="stat-label">Objectifs assignés</span>
        </div>
        <div className="stat">
          <span className="stat-number">{objectifsAssignes.filter(o => o.statut === 'en_cours').length}</span>
          <span className="stat-label">En cours</span>
        </div>
        <div className="stat">
          <span className="stat-number">{objectifsAssignes.filter(o => o.statut === 'atteint').length}</span>
          <span className="stat-label">Atteints</span>
        </div>
        <div className="stat">
          <span className="stat-number">
            {objectifsAssignes.length > 0 
              ? Math.round((objectifsAssignes.reduce((sum, o) => sum + o.progres, 0) / objectifsAssignes.length)) 
              : 0}%
          </span>
          <span className="stat-label">Progression moyenne</span>
        </div>
      </div>

      {objectifsAssignes.length > 0 && (
        <div className="assigned-section">
          <h3>📌 Objectifs assignés lors de cet entretien</h3>
          <div className="assigned-grid">
            {objectifsAssignes.map(assignation => (
              <AssignedObjectifCard
                key={assignation.id}
                assignation={assignation}
                onUpdate={handleUpdateAssignation}
                onDelete={handleDeleteAssignation}
              />
            ))}
          </div>
        </div>
      )}

      <div className="assign-section">
        <div className="section-header">
          <h3>📚 Bibliothèque d'objectifs - Sélectionnez pour assigner</h3>
          <div className="filters">
            <button 
              className={`filter-btn ${filterCategorie === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCategorie('all')}
            >
              Tous ({objectifsTemplates.length})
            </button>
            {Object.entries(CATEGORIES).map(([key, val]) => {
              const count = objectifsTemplates.filter(o => o.categorie === key).length;
              return count > 0 ? (
                <button
                  key={key}
                  className={`filter-btn ${filterCategorie === key ? 'active' : ''}`}
                  onClick={() => setFilterCategorie(key)}
                >
                  {val.icon} {val.label} ({count})
                </button>
              ) : null;
            })}
          </div>
        </div>

        <div className="templates-grid">
          {filteredTemplates.map(template => {
            const isAssigned = objectifsAssignes.some(a => a.objectif_template_id === template.id);
            return (
              <div 
                key={template.id} 
                className={`template-tag ${isAssigned ? 'assigned' : ''}`}
                onClick={() => {
                  if (!isAssigned) {
                    setAssignFormData({...assignFormData, objectif_template_id: template.id});
                    setShowAssignModal(true);
                  }
                }}
              >
                <div className="tag-icon" style={{ backgroundColor: CATEGORIES[template.categorie].color }}>
                  {CATEGORIES[template.categorie].icon}
                </div>
                <div className="tag-content">
                  <h4>{template.titre}</h4>
                  {template.description && <p>{template.description}</p>}
                  <span className="tag-categorie" style={{ color: CATEGORIES[template.categorie].color }}>
                    {CATEGORIES[template.categorie].label}
                  </span>
                </div>
                {isAssigned && <div className="assigned-badge">✅ Déjà assigné</div>}
              </div>
            );
          })}
        </div>
      </div>

      {showAssignModal && (
        <div className="modal-overlay" onClick={resetAssignForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>➕ Assigner un objectif</h3>
            <form onSubmit={handleAssignObjectif}>
              <div className="form-group">
                <label>Objectif sélectionné</label>
                <div className="selected-objectif">
                  {objectifsTemplates.find(t => t.id === assignFormData.objectif_template_id)?.titre}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priorité</label>
                  <select
                    value={assignFormData.priorite}
                    onChange={(e) => setAssignFormData({...assignFormData, priorite: e.target.value})}
                  >
                    {Object.entries(PRIORITES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date d'échéance</label>
                  <input
                    type="date"
                    value={assignFormData.date_echeance}
                    onChange={(e) => setAssignFormData({...assignFormData, date_echeance: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes (optionnel)</label>
                <textarea
                  value={assignFormData.notes}
                  onChange={(e) => setAssignFormData({...assignFormData, notes: e.target.value})}
                  rows="3"
                  placeholder="Contexte, critères de réussite..."
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="assign-btn">
                  ✅ Assigner
                </button>
                <button type="button" onClick={resetAssignForm} className="cancel-btn">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignedObjectifCard({ assignation, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    priorite: assignation.priorite,
    statut: assignation.statut,
    progres: assignation.progres,
    date_echeance: assignation.date_echeance ? assignation.date_echeance.split('T')[0] : '',
    notes: assignation.notes || ''
  });

  const handleSave = () => {
    onUpdate(assignation.id, formData);
    setEditing(false);
  };

  const categorie = CATEGORIES[assignation.objectifTemplate.categorie];
  const priorite = PRIORITES[assignation.priorite];
  const statut = STATUTS[assignation.statut];

  return (
    <div className="assigned-card">
      <div className="card-header">
        <span className="card-icon" style={{ backgroundColor: categorie.color }}>
          {categorie.icon}
        </span>
        <div className="card-actions">
          {!editing && (
            <>
              <button onClick={() => setEditing(true)} className="edit-btn">✏️</button>
              <button onClick={() => onDelete(assignation.id)} className="delete-btn">🗑️</button>
            </>
          )}
        </div>
      </div>

      <h4>{assignation.objectifTemplate.titre}</h4>

      {editing ? (
        <div className="edit-form">
          <div className="form-group">
            <label>Priorité</label>
            <select value={formData.priorite} onChange={(e) => setFormData({...formData, priorite: e.target.value})}>
              {Object.entries(PRIORITES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Statut</label>
            <select value={formData.statut} onChange={(e) => setFormData({...formData, statut: e.target.value})}>
              {Object.entries(STATUTS).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Progression ({formData.progres}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progres}
              onChange={(e) => setFormData({...formData, progres: parseInt(e.target.value)})}
            />
          </div>

          <div className="form-group">
            <label>Date d'échéance</label>
            <input
              type="date"
              value={formData.date_echeance}
              onChange={(e) => setFormData({...formData, date_echeance: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows="2"
            />
          </div>

          <div className="edit-actions">
            <button onClick={handleSave} className="save-btn">💾 Sauvegarder</button>
            <button onClick={() => setEditing(false)} className="cancel-btn">Annuler</button>
          </div>
        </div>
      ) : (
        <>
          <div className="card-info">
            <span className="badge-priorite" style={{ backgroundColor: priorite.color }}>
              {priorite.label}
            </span>
            <span className="badge-statut" style={{ color: statut.color }}>
              {statut.icon} {statut.label}
            </span>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span>Progression</span>
              <span>{assignation.progres}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${assignation.progres}%` }} />
            </div>
          </div>

          {assignation.date_echeance && (
            <div className="card-date">
              📅 Échéance: {new Date(assignation.date_echeance).toLocaleDateString('fr-FR')}
            </div>
          )}

          {assignation.notes && (
            <div className="card-notes">
              <strong>Notes:</strong> {assignation.notes}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EntretienObjectifs;