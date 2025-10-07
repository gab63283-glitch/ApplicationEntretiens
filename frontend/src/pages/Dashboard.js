import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

const API_URL = 'http://localhost:3002/api';

function Dashboard() {
  const { manager, logout } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [entretiens, setEntretiens] = useState([]);
  const [objectifsAssignes, setObjectifsAssignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesRes, entretiensRes, objectifsRes] = await Promise.all([
        axios.get(`${API_URL}/employees`),
        axios.get(`${API_URL}/entretiens`),
        axios.get(`${API_URL}/objectifs-assignes`)
      ]);
      
      setEmployees(employeesRes.data);
      setEntretiens(entretiensRes.data);
      setObjectifsAssignes(objectifsRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Statistiques
  const stats = {
    totalEmployees: employees.length,
    entretiensAPlanifier: employees.length * 7,
    entretiensRealises: entretiens.filter(e => e.statut === 'realise').length,
    entretiensAVenir: entretiens.filter(e => e.statut === 'planifie').length,
    objectifsTotal: objectifsAssignes.length,
    objectifsEnCours: objectifsAssignes.filter(o => o.statut === 'en_cours').length,
    objectifsAtteints: objectifsAssignes.filter(o => o.statut === 'atteint').length
  };

  if (loading) {
    return <div className="dashboard-loading">Chargement...</div>;
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>📋 Gestion des Entretiens</h1>
          <p>Bienvenue, <strong>{manager?.nom}</strong> - {manager?.departement}</p>
        </div>
        <div className="header-right">
          <button onClick={handleLogout} className="logout-btn">
            🚪 Déconnexion
          </button>
        </div>
      </header>

      {/* Statistiques */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalEmployees}</h3>
            <p>Collaborateurs</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.entretiensRealises}</h3>
            <p>Entretiens réalisés</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>{stats.entretiensAVenir}</h3>
            <p>À venir</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{stats.objectifsTotal}</h3>
            <p>Objectifs assignés</p>
          </div>
        </div>
      </div>

      {/* Navigation rapide */}
      <div className="quick-actions">
        <h2>Actions rapides</h2>
        <div className="actions-grid">
          <button 
            className="action-card"
            onClick={() => navigate('/employees')}
          >
            <div className="action-icon">👥</div>
            <h3>Mon équipe</h3>
            <p>Voir et gérer vos collaborateurs</p>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/entretiens')}
          >
            <div className="action-icon">📋</div>
            <h3>Entretiens</h3>
            <p>Historique et planification</p>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/entretiens/new')}
          >
            <div className="action-icon">➕</div>
            <h3>Nouvel entretien</h3>
            <p>Planifier un entretien</p>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/objectifs-library')}
          >
            <div className="action-icon">📚</div>
            <h3>Bibliothèque d'objectifs</h3>
            <p>Gérer les objectifs réutilisables</p>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/objectifs-dashboard')}
          >
            <div className="action-icon">🎯</div>
            <h3>Suivi des objectifs</h3>
            <p>Vue d'ensemble des objectifs assignés</p>
          </button>

          <button 
            className="action-card"
            onClick={() => navigate('/templates')}
          >
            <div className="action-icon">📝</div>
            <h3>Templates</h3>
            <p>Modèles d'entretiens</p>
          </button>
        </div>
      </div>

      {/* Prochains entretiens */}
      <div className="upcoming-section">
        <h2>Prochains entretiens</h2>
        {entretiens.filter(e => e.statut === 'planifie').length === 0 ? (
          <p className="empty-state">Aucun entretien planifié</p>
        ) : (
          <div className="entretiens-list">
            {entretiens
              .filter(e => e.statut === 'planifie')
              .slice(0, 5)
              .map(entretien => (
                <div key={entretien.id} className="entretien-item">
                  <div className="entretien-info">
                    <h4>{entretien.titre}</h4>
                    <p>👤 {entretien.employee?.nom} - {entretien.employee?.poste}</p>
                    <p className="entretien-date">
                      📅 {new Date(entretien.date_prevue).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="entretien-type">
                    <span className={`badge badge-${entretien.type}`}>
                      {entretien.type === 'annuel' ? '📅 Annuel' : '📆 Bimestriel'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Objectifs récents */}
      {objectifsAssignes.length > 0 && (
        <div className="upcoming-section">
          <h2>Objectifs récemment assignés</h2>
          <div className="objectifs-preview">
            {objectifsAssignes.slice(0, 5).map(objectif => (
              <div key={objectif.id} className="objectif-preview-item">
                <div className="objectif-preview-info">
                  <h4>{objectif.objectifTemplate.titre}</h4>
                  <p>👤 {objectif.employee.nom}</p>
                  <div className="preview-progress">
                    <div className="preview-progress-bar">
                      <div 
                        className="preview-progress-fill" 
                        style={{ width: `${objectif.progres}%` }}
                      />
                    </div>
                    <span className="preview-progress-text">{objectif.progres}%</span>
                  </div>
                </div>
                <span className={`preview-statut statut-${objectif.statut}`}>
                  {objectif.statut === 'en_cours' && '⏳'}
                  {objectif.statut === 'atteint' && '✅'}
                  {objectif.statut === 'non_atteint' && '❌'}
                  {objectif.statut === 'reporte' && '⏸️'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;