import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './NewEntretien.css';

const API_URL = 'http://localhost:3002/api';

function NewEntretien() {
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    template_id: '',
    type: 'bimestriel',
    date_prevue: '',
    titre: '',
    objectifs: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeesRes, templatesRes] = await Promise.all([
        axios.get(`${API_URL}/employees`),
        axios.get(`${API_URL}/templates`)
      ]);
      
      setEmployees(employeesRes.data);
      setTemplates(templatesRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.employee_id || !formData.date_prevue || !formData.titre) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(`${API_URL}/entretiens`, {
        ...formData,
        employee_id: parseInt(formData.employee_id),
        template_id: formData.template_id ? parseInt(formData.template_id) : null
      });

      alert('Entretien créé avec succès !');
      navigate('/entretiens');
    } catch (error) {
      console.error('Erreur création entretien:', error);
      alert(error.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  // Auto-génération du titre selon le type et l'employé
  useEffect(() => {
    if (formData.employee_id && formData.type) {
      const employee = employees.find(e => e.id === parseInt(formData.employee_id));
      if (employee) {
        const typeLabel = formData.type === 'annuel' ? 'Annuel' : 'Bimestriel';
        const date = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
        setFormData(prev => ({
          ...prev,
          titre: `Entretien ${typeLabel} - ${employee.nom} - ${date}`
        }));
      }
    }
  }, [formData.employee_id, formData.type, employees]);

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="new-entretien-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <button onClick={() => navigate('/entretiens')} className="back-btn">
            ← Retour
          </button>
          <div className="header-info">
            <h1>➕ Nouvel Entretien</h1>
            <p>Planifier un entretien avec un collaborateur</p>
          </div>
        </div>
      </header>

      {/* Formulaire */}
      <div className="form-container">
        <form onSubmit={handleSubmit} className="entretien-form">
          
          {/* Section 1 : Informations de base */}
          <div className="form-section">
            <h3>📋 Informations de base</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Collaborateur *</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => handleInputChange('employee_id', e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="">Sélectionner un collaborateur</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nom} - {emp.poste}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Type d'entretien *</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  required
                  disabled={submitting}
                >
                  <option value="bimestriel">📆 Bimestriel</option>
                  <option value="annuel">📅 Annuel</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label>Titre de l'entretien *</label>
                <input
                  type="text"
                  value={formData.titre}
                  onChange={(e) => handleInputChange('titre', e.target.value)}
                  placeholder="Ex: Entretien Annuel - Jean Dupont - 2025"
                  required
                  disabled={submitting}
                />
                <small>Le titre est généré automatiquement mais vous pouvez le modifier</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date prévue *</label>
                <input
                  type="date"
                  value={formData.date_prevue}
                  onChange={(e) => handleInputChange('date_prevue', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label>Template (optionnel)</label>
                <select
                  value={formData.template_id}
                  onChange={(e) => handleInputChange('template_id', e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Sans template</option>
                  {templates
                    .filter(t => t.type === formData.type)
                    .map(template => (
                      <option key={template.id} value={template.id}>
                        {template.nom}
                      </option>
                    ))}
                </select>
                <small>Les templates correspondent au type d'entretien sélectionné</small>
              </div>
            </div>
          </div>

          {/* Section 2 : Objectifs */}
          <div className="form-section">
            <h3>🎯 Objectifs de l'entretien</h3>
            
            <div className="form-group full-width">
              <label>Objectifs (optionnel)</label>
              <textarea
                value={formData.objectifs}
                onChange={(e) => handleInputChange('objectifs', e.target.value)}
                placeholder="Décrivez les objectifs principaux de cet entretien...&#10;Exemple :&#10;- Faire le point sur les projets en cours&#10;- Discuter des objectifs du prochain trimestre&#10;- Identifier les besoins en formation"
                rows="6"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Aperçu */}
          {formData.employee_id && formData.date_prevue && (
            <div className="preview-section">
              <h3>👁️ Aperçu</h3>
              <div className="preview-card">
                <div className="preview-header">
                  <h4>{formData.titre || 'Sans titre'}</h4>
                  <span className={`badge badge-${formData.type}`}>
                    {formData.type === 'annuel' ? '📅 Annuel' : '📆 Bimestriel'}
                  </span>
                </div>
                <div className="preview-body">
                  <p><strong>Collaborateur :</strong> {employees.find(e => e.id === parseInt(formData.employee_id))?.nom}</p>
                  <p><strong>Date prévue :</strong> {new Date(formData.date_prevue).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</p>
                  {formData.template_id && (
                    <p><strong>Template :</strong> {templates.find(t => t.id === parseInt(formData.template_id))?.nom}</p>
                  )}
                  {formData.objectifs && (
                    <div className="preview-objectifs">
                      <strong>Objectifs :</strong>
                      <p>{formData.objectifs}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate('/entretiens')} 
              className="cancel-btn"
              disabled={submitting}
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Création...' : '✅ Créer l\'entretien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewEntretien;