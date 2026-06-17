'use client';

import { Card, Button } from 'react-bootstrap';
import Image from 'next/image';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

interface WelcomeStepProps {
  userName: string;
  organizationName: string;
  onNext: () => void;
}

export default function WelcomeStep({
  userName,
  organizationName,
  onNext,
}: WelcomeStepProps) {
  return (
    <div className="text-center">
      <div className="mb-4">
        <div style={{
          width: '100px',
          height: '100px',
          margin: '0 auto',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
        }}>
          <i className="bi bi-emoji-smile-fill text-white" style={{ fontSize: '3rem' }}></i>
        </div>
      </div>
      <h2 className="mb-3" style={{ color: '#1a1a1a', fontWeight: 600 }}>¡Bienvenido a CertyPass!</h2>
      <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '2rem' }}>
        Hola <strong style={{ color: '#1a1a1a' }}>{userName}</strong>, estamos encantados de tenerte aquí.
      </p>
      
      <Card className="mb-4 border-0" style={{ backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
        <Card.Body className="p-4">
          <h5 className="mb-3" style={{ color: '#1a1a1a', fontWeight: 600 }}>
            <i className="bi bi-building me-2" style={{ color: '#667eea' }}></i>
            Organización: <span style={{ color: '#667eea' }}>{organizationName}</span>
          </h5>
          <p className="mb-0" style={{ color: '#666' }}>
            Estás a punto de completar la configuración inicial de tu cuenta como administrador.
          </p>
        </Card.Body>
      </Card>

      <div className="mb-4">
        <h5 className="mb-3" style={{ color: '#1a1a1a', fontWeight: 600 }}>¿Qué sigue?</h5>
        <div className="d-flex flex-column gap-3 align-items-start" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div className="d-flex align-items-start w-100">
            <div className="me-3">
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
              }}>
                1
              </div>
            </div>
            <div className="flex-grow-1 text-start">
              <strong style={{ color: '#1a1a1a' }}>Establecer contraseña</strong>
              <p style={{ color: '#666', marginBottom: 0, fontSize: '0.9rem' }}>
                Crea una contraseña segura para proteger tu cuenta
              </p>
            </div>
          </div>
          
          <div className="d-flex align-items-start w-100">
            <div className="me-3">
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
              }}>
                2
              </div>
            </div>
            <div className="flex-grow-1 text-start">
              <strong style={{ color: '#1a1a1a' }}>Verificación de identidad (KYC)</strong>
              <p style={{ color: '#666', marginBottom: 0, fontSize: '0.9rem' }}>
                Completa el proceso de verificación para tu organización
              </p>
            </div>
          </div>
        </div>
      </div>

      <Button
        size="lg"
        onClick={onNext}
        className="px-5"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          padding: '14px 32px',
          boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
        }}
      >
        Comenzar
        <i className="bi bi-arrow-right ms-2"></i>
      </Button>
    </div>
  );
}
