import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import './Register.css';

const API_URL = 'http://localhost:3002/api';

function Register() {
  const [step, setStep] = useState(1); // 1: formulaire, 2: vérification code
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    departement: '',
    mot_de_passe: '',
    confirmPassword: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
  };

  const handleSubmitStep1 = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (formData.mot_de_passe !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.mot_de_passe.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Format d\'email invalide');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/request-code`, {
        nom: formData.nom,
        email: formData.email,
        mot_de_passe: formData.mot_de_passe,
        departement: formData.departement
      });

      setStep(2);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitStep2 = async (e) => {
    e.preventDefault();
    setError('');

    if (verificationCode.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/verify-code`, {
        email: formData.email,
        code: verificationCode
      });

      // Connexion automatique après création du compte
      localStorage.setItem('token', response.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      alert('Compte créé avec succès ! Bienvenue 🎉');
      navigate('/dashboard');
      window.location.reload(); // Pour recharger le contexte
    } catch (err) {
      setError(err.response?.data?.error || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/auth/request-code`, {
        nom: formData.nom,
        email: formData.email,
        mot_de_passe: formData.mot_de_passe,
        departement: formData.departement
      });

      alert('Un nouveau code a été envoyé par email !');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="register-header">
          <h1>📋 Gestion des Entretiens</h1>
          <p>Créer un compte manager</p>
        </div>

        {step === 1 ? (
          // Étape 1 : Formulaire d'inscription
          <form onSubmit={handleSubmitStep1} className="register-form">
            <div className="step-indicator">
              <div className="step active">1</div>
              <div className="step-line"></div>
              <div className="step">2</div>
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="nom">Nom complet *</label>
              <input
                type="text"
                id="nom"
                value={formData.nom}
                onChange={(e) => handleInputChange('nom', e.target.value)}
                placeholder="Jean Dupont"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email professionnel *</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="jean.dupont@entreprise.com"
                required
                disabled={loading}
              />
              <small>Vous recevrez un code de vérification à cette adresse</small>
            </div>

            <div className="form-group">
              <label htmlFor="departement">Département (optionnel)</label>
              <input
                type="text"
                id="departement"
                value={formData.departement}
                onChange={(e) => handleInputChange('departement', e.target.value)}
                placeholder="Ressources Humaines"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe *</label>
              <input
                type="password"
                id="password"
                value={formData.mot_de_passe}
                onChange={(e) => handleInputChange('mot_de_passe', e.target.value)}
                placeholder="Minimum 8 caractères"
                required
                disabled={loading}
                minLength="8"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmer le mot de passe *</label>
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Ressaisissez votre mot de passe"
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="register-button"
              disabled={loading}
            >
              {loading ? 'Envoi en cours...' : 'Recevoir le code par email →'}
            </button>

            <div className="login-link">
              Vous avez déjà un compte ? <Link to="/">Se connecter</Link>
            </div>
          </form>
        ) : (
          // Étape 2 : Vérification du code
          <form onSubmit={handleSubmitStep2} className="register-form">
            <div className="step-indicator">
              <div className="step completed">✓</div>
              <div className="step-line completed"></div>
              <div className="step active">2</div>
            </div>

            <div className="verification-info">
              <p>📧 Un code de vérification a été envoyé à :</p>
              <strong>{formData.email}</strong>
              <p className="hint">Vérifiez vos spams si vous ne le trouvez pas</p>
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="code">Code de vérification (6 chiffres)</label>
              <input
                type="text"
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                disabled={loading}
                maxLength="6"
                className="code-input"
              />
              <small>Le code est valide pendant 10 minutes</small>
            </div>

            <button 
              type="submit" 
              className="register-button"
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? 'Vérification...' : '✅ Créer mon compte'}
            </button>

            <div className="resend-section">
              <p>Vous n'avez pas reçu le code ?</p>
              <button 
                type="button" 
                onClick={handleResendCode}
                className="resend-button"
                disabled={loading}
              >
                📨 Renvoyer le code
              </button>
            </div>

            <button 
              type="button"
              onClick={() => setStep(1)}
              className="back-button"
              disabled={loading}
            >
              ← Retour
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Register;