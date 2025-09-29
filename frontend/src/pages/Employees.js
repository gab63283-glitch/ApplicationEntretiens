import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './Employees.css';

const API_URL = 'http://localhost:3002/api';

function Employees() {
  const { manager } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    poste: '',
    date_embauche: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/employees`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Erreur chargement employés:', error);
      alert('Erreur lors du chargement des employés');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingEmployee) {
        // Mise à jour
        const response = await axios.put(
          `${API_URL}/employees/${editingEmployee.id}`,
          formData
        );
        setEmployees(employees.map(emp => 
          emp.id === editingEmployee.id ? response.data : emp
        ));
        alert('Employé modifié avec succès !');
      } else {
        // Création
        const response = await axios.post(`${API_URL}/employees`, formData);
        setEmployees([...employees, response.data]);
        alert('Employé ajouté avec succès !');
      }

      // Réinitialiser le formulaire
      setShowAddForm(false);
      setEditingEmployee(null);
      setFormData({ nom: '', email: '', poste: '', date_embauche: '' });

    } catch (error) {
      console.error('Erreur:', error);
      alert(error.response?.data?.error || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      nom: employee.nom,
      email: employee.email,
      poste: employee.poste,
      date_embauche: employee.date_embauche.split('T')[0]
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/employees/${id}`);
      setEmployees(employees.filter(emp => emp.id !== id));
      alert('Employé supprimé avec succès');
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingEmployee(null);
    setFormData({ nom: '', email: '', poste: '', date_embauche: '' });
  };

  const calculateAnciennete = (dateEmbauche) => {
    const date = new Date(dateEmbauche);
    const now = new Date();
    const years = now.getFullYear() - date.getFullYear();
    const months = now.getMonth() - date.getMonth();
    
    if (years === 0) {
      return `${months} mois`;
    } else if (months < 0) {
      return `${years - 1} an${years > 1 ? 's' : ''}`;
    } else {
      return `${years} an${years > 1 ? 's' : ''}`;
    }
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="employees-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Retour
          </button>
          <div className="header-info">
            <h1>👥 Mon Équipe</h1>
            <p>{employees.length} collaborateur{employees.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <button 
          className="add-employee-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '❌ Annuler' : '➕ Ajouter un collaborateur'}
        </button>
      </header>

      {/* Formulaire d'ajout/édition */}
      {showAddForm && (
        <div className="form-section">
          <div className="form-card">
            <h3>{editingEmployee ? '✏️ Modifier le collaborateur' : '➕ Nouveau collaborateur'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nom complet *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    required
                    placeholder="Jean Dupont"
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    placeholder="jean.dupont@entreprise.com"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Poste *</label>
                  <input
                    type="text"
                    value={formData.poste}
                    onChange={(e) => setFormData({...formData, poste: e.target.value})}
                    required
                    placeholder="Développeur Senior"
                  />
                </div>
                <div className="form-group">
                  <label>Date d'embauche *</label>
                  <input
                    type="date"
                    value={formData.date_embauche}
                    onChange={(e) => setFormData({...formData, date_embauche: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn">
                  {editingEmployee ? '💾 Sauvegarder' : '➕ Ajouter'}
                </button>
                <button type="button" onClick={cancelForm} className="cancel-btn">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liste des employés */}
      <div className="employees-grid">
        {employees.length === 0 ? (
          <div className="empty-state">
            <p>Aucun collaborateur dans votre équipe</p>
            <button onClick={() => setShowAddForm(true)} className="add-first-btn">
              Ajouter votre premier collaborateur
            </button>
          </div>
        ) : (
          employees.map(employee => (
            <div key={employee.id} className="employee-card">
              <div className="employee-header">
                <div className="employee-avatar">
                  {employee.nom.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div className="employee-info">
                  <h3>{employee.nom}</h3>
                  <p className="employee-poste">{employee.poste}</p>
                </div>
              </div>

              <div className="employee-details">
                <div className="detail-item">
                  <span className="detail-icon">📧</span>
                  <span>{employee.email}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">📅</span>
                  <span>
                    Embauché le {new Date(employee.date_embauche).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">⏱️</span>
                  <span>Ancienneté : {calculateAnciennete(employee.date_embauche)}</span>
                </div>
              </div>

              <div className="employee-actions">
                <button 
                  onClick={() => navigate(`/entretiens?employee=${employee.id}`)}
                  className="view-entretiens-btn"
                  title="Voir les entretiens"
                >
                  📋 Entretiens
                </button>
                <button 
                  onClick={() => handleEdit(employee)}
                  className="edit-btn"
                  title="Modifier"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDelete(employee.id)}
                  className="delete-btn"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Employees;