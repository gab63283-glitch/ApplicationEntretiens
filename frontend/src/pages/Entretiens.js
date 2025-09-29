import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './Entretiens.css';

const API_URL = 'http://localhost:3002/api';

function Entretiens() {
  const [entretiens, setEntretiens] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const employeeFilter = searchParams.get('employee');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entretiensRes, employeesRes] = await Promise.all([
        axios.get(`${API_URL}/entretiens`),
        axios.get(`${API_URL}/employees`)
      ]);
      
      setEntretiens(entretiensRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.nom : 'Inconnu';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet entretien ?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/entretiens/${id}`);
      setEntretiens(entretiens.filter(e => e.id !== id));
      alert('Entretien supprimé avec succès');
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/entretiens/${id}`, { statut: newStatus });
      setEntretiens(entretiens.map(e => 
        e.id === id ? { ...e, statut: newStatus } : e
      ));
    } catch (error) {
      console.error('Erreur changement statut:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  // Filtrage
  const filteredEntretiens = entretiens.filter(entretien => {
    let matchStatus = filterStatus === 'all' || entretien.statut === filterStatus;
    let matchType = filterType === 'all' || entretien.type === filterType;
    let matchEmployee = !employeeFilter || entretien.employee_id === parseInt(employeeFilter);
    
    return matchStatus && matchType && matchEmployee;
  });

  const getStatusBadgeClass = (status) => {
    const classes = {
      'planifie': 'status-planifie',
      'en_preparation': 'status-preparation',
      'realise': 'status-realise',
      'reporte': 'status-reporte'
    };
    return classes[status] || '';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'planifie': '📅 Planifié',
      'en_preparation': '📝 En préparation',
      'realise': '✅ Réalisé',
      'reporte': '⏸️ Reporté'
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="entretiens-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Retour
          </button>
          <div className="header-info">
            <h1>📋 Entretiens</h1>
            <p>{filteredEntretiens.length} entretien{filteredEntretiens.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button 
          className="add-entretien-btn"
          onClick={() => navigate('/entretiens/new')}
        >
          ➕ Nouvel entretien
        </button>
      </header>

      {/* Filtres */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Statut :</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tous</option>
            <option value="planifie">Planifié</option>
            <option value="en_preparation">En préparation</option>
            <option value="realise">Réalisé</option>
            <option value="reporte">Reporté</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Type :</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tous</option>
            <option value="annuel">Annuel</option>
            <option value="bimestriel">Bimestriel</option>
          </select>
        </div>

        <button onClick={loadData} className="refresh-btn">
          🔄 Actualiser
        </button>
      </div>

      {/* Liste des entretiens */}
      {filteredEntretiens.length === 0 ? (
        <div className="empty-state">
          <p>Aucun entretien trouvé</p>
          <button onClick={() => navigate('/entretiens/new')} className="add-first-btn">
            Créer votre premier entretien
          </button>
        </div>
      ) : (
        <div className="entretiens-grid">
          {filteredEntretiens.map(entretien => (
            <div key={entretien.id} className="entretien-card">
              <div className="entretien-header">
                <div className="entretien-title">
                  <h3>{entretien.titre}</h3>
                  <span className={`type-badge type-${entretien.type}`}>
                    {entretien.type === 'annuel' ? '📅 Annuel' : '📆 Bimestriel'}
                  </span>
                </div>
                <div className={`status-badge ${getStatusBadgeClass(entretien.statut)}`}>
                  {getStatusLabel(entretien.statut)}
                </div>
              </div>

              <div className="entretien-body">
                <div className="entretien-info-item">
                  <span className="info-icon">👤</span>
                  <div>
                    <strong>{entretien.employee?.nom || getEmployeeName(entretien.employee_id)}</strong>
                    <p>{entretien.employee?.poste}</p>
                  </div>
                </div>

                <div className="entretien-info-item">
                  <span className="info-icon">📅</span>
                  <div>
                    <strong>Date prévue</strong>
                    <p>{new Date(entretien.date_prevue).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  </div>
                </div>

                {entretien.date_realise && (
                  <div className="entretien-info-item">
                    <span className="info-icon">✅</span>
                    <div>
                      <strong>Réalisé le</strong>
                      <p>{new Date(entretien.date_realise).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                )}

                {entretien.objectifs && (
                  <div className="entretien-objectifs">
                    <strong>Objectifs :</strong>
                    <p>{entretien.objectifs}</p>
                  </div>
                )}
              </div>

              <div className="entretien-actions">
                <select
                  value={entretien.statut}
                  onChange={(e) => handleStatusChange(entretien.id, e.target.value)}
                  className="status-select"
                >
                  <option value="planifie">Planifié</option>
                  <option value="en_preparation">En préparation</option>
                  <option value="realise">Réalisé</option>
                  <option value="reporte">Reporté</option>
                </select>

                <button 
                  onClick={() => navigate(`/entretiens/${entretien.id}/notes`)}
                  className="notes-btn"
                  title="Voir/Ajouter des notes"
                >
                  📝 Notes
                </button>

                <button 
                  onClick={() => navigate(`/entretiens/${entretien.id}/edit`)}
                  className="edit-btn"
                  title="Modifier"
                >
                  ✏️
                </button>

                <button 
                  onClick={() => handleDelete(entretien.id)}
                  className="delete-btn"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Entretiens;