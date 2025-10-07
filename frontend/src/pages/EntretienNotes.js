import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './EntretienNotes.css';

const API_URL = 'http://localhost:3002/api';

function EntretienNotes() {
  const { id } = useParams();
  const [entretien, setEntretien] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('preparation');
  const [newNote, setNewNote] = useState({ section: '', contenu: '', type: 'preparation' });
  const [editingNote, setEditingNote] = useState(null);
  const navigate = useNavigate();

  // Sections prédéfinies
  const sections = {
    preparation: [
      'Objectifs de l\'entretien',
      'Points à aborder',
      'Questions à poser',
      'Préparation générale'
    ],
    temps_reel: [
      'Discussion',
      'Feedback du collaborateur',
      'Points positifs',
      'Axes d\'amélioration',
      'Projets en cours',
      'Besoins identifiés'
    ],
    conclusion: [
      'Résumé de l\'entretien',
      'Décisions prises',
      'Actions à mener',
      'Prochaines étapes',
      'Objectifs fixés'
    ]
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entretienRes, notesRes] = await Promise.all([
        axios.get(`${API_URL}/entretiens/${id}`),
        axios.get(`${API_URL}/entretiens/${id}/notes`)
      ]);
      
      setEntretien(entretienRes.data);
      setNotes(notesRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      alert('Erreur lors du chargement');
      navigate('/entretiens');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    
    if (!newNote.section || !newNote.contenu) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/entretiens/${id}/notes`, {
        section: newNote.section,
        contenu: newNote.contenu,
        type: activeSection
      });

      setNotes([...notes, response.data]);
      setNewNote({ section: '', contenu: '', type: activeSection });
      alert('Note ajoutée avec succès !');
    } catch (error) {
      console.error('Erreur ajout note:', error);
      alert('Erreur lors de l\'ajout de la note');
    }
  };

  const handleUpdateNote = async (noteId, updatedContent) => {
    try {
      const response = await axios.put(`${API_URL}/notes/${noteId}`, {
        contenu: updatedContent
      });

      setNotes(notes.map(note => 
        note.id === noteId ? response.data : note
      ));
      setEditingNote(null);
      alert('Note mise à jour avec succès !');
    } catch (error) {
      console.error('Erreur mise à jour note:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/notes/${noteId}`);
      setNotes(notes.filter(note => note.id !== noteId));
      alert('Note supprimée avec succès');
    } catch (error) {
      console.error('Erreur suppression note:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getNotesByType = (type) => {
    return notes.filter(note => note.type === type);
  };

  const exportToPDF = () => {
    alert('Fonctionnalité d\'export PDF à venir !');
    // TODO: Implémenter l'export PDF
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  if (!entretien) {
    return <div className="loading">Entretien introuvable</div>;
  }

  return (
    <div className="entretien-notes-page">
      {/* Header */}
      <header className="notes-header">
        <div className="header-left">
          <button onClick={() => navigate('/entretiens')} className="back-btn">
            ← Retour
          </button>
          <div className="header-info">
            <h1>📝 Notes - {entretien.titre}</h1>
            <div className="entretien-meta">
              <span>👤 {entretien.employee?.nom}</span>
              <span>📅 {new Date(entretien.date_prevue).toLocaleDateString('fr-FR')}</span>
              <span className={`status-badge status-${entretien.statut}`}>
                {entretien.statut}
              </span>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={exportToPDF} className="export-btn">
            📄 Exporter PDF
          </button>
         
<div className="header-actions">
  <button onClick={() => navigate(`/entretiens/${id}/objectifs`)} className="objectifs-btn">
    🎯 Objectifs
  </button>
</div>
        </div>
      </header>

      {/* Navigation par onglets */}
      <div className="tabs-navigation">
        <button
          className={`tab ${activeSection === 'preparation' ? 'active' : ''}`}
          onClick={() => setActiveSection('preparation')}
        >
          📋 Préparation ({getNotesByType('preparation').length})
        </button>
        <button
          className={`tab ${activeSection === 'temps_reel' ? 'active' : ''}`}
          onClick={() => setActiveSection('temps_reel')}
        >
          💬 Entretien en direct ({getNotesByType('temps_reel').length})
        </button>
        <button
          className={`tab ${activeSection === 'conclusion' ? 'active' : ''}`}
          onClick={() => setActiveSection('conclusion')}
        >
          ✅ Conclusion ({getNotesByType('conclusion').length})
        </button>
      </div>

      <div className="notes-content">
        <div className="notes-grid">
          
          {/* Formulaire d'ajout */}
          <div className="add-note-section">
            <h3>➕ Ajouter une note</h3>
            <form onSubmit={handleAddNote} className="note-form">
              <div className="form-group">
                <label>Section</label>
                <select
                  value={newNote.section}
                  onChange={(e) => setNewNote({...newNote, section: e.target.value})}
                  required
                >
                  <option value="">Choisir une section...</option>
                  {sections[activeSection].map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Contenu</label>
                <textarea
                  value={newNote.contenu}
                  onChange={(e) => setNewNote({...newNote, contenu: e.target.value})}
                  placeholder="Écrivez votre note ici..."
                  rows="5"
                  required
                />
              </div>

              <button type="submit" className="add-btn">
                ➕ Ajouter la note
              </button>
            </form>
          </div>

          {/* Liste des notes */}
          <div className="notes-list-section">
            <h3>📄 Notes ({getNotesByType(activeSection).length})</h3>
            
            {getNotesByType(activeSection).length === 0 ? (
              <div className="empty-notes">
                <p>Aucune note pour cette section</p>
                <p className="hint">Utilisez le formulaire pour ajouter votre première note</p>
              </div>
            ) : (
              <div className="notes-list">
                {sections[activeSection].map(sectionName => {
                  const sectionNotes = getNotesByType(activeSection).filter(
                    note => note.section === sectionName
                  );
                  
                  if (sectionNotes.length === 0) return null;

                  return (
                    <div key={sectionName} className="notes-group">
                      <h4 className="section-title">{sectionName}</h4>
                      {sectionNotes.map(note => (
                        <div key={note.id} className="note-card">
                          {editingNote === note.id ? (
                            <div className="note-edit">
                              <textarea
                                defaultValue={note.contenu}
                                id={`edit-${note.id}`}
                                rows="4"
                              />
                              <div className="note-edit-actions">
                                <button
                                  onClick={() => {
                                    const textarea = document.getElementById(`edit-${note.id}`);
                                    handleUpdateNote(note.id, textarea.value);
                                  }}
                                  className="save-edit-btn"
                                >
                                  💾 Sauvegarder
                                </button>
                                <button
                                  onClick={() => setEditingNote(null)}
                                  className="cancel-edit-btn"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="note-content">
                                <p>{note.contenu}</p>
                                <span className="note-date">
                                  {new Date(note.createdAt).toLocaleString('fr-FR')}
                                </span>
                              </div>
                              <div className="note-actions">
                                <button
                                  onClick={() => setEditingNote(note.id)}
                                  className="edit-note-btn"
                                  title="Modifier"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="delete-note-btn"
                                  title="Supprimer"
                                >
                                  🗑️
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EntretienNotes;