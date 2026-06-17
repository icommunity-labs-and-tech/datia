'use client';

import { useState, useEffect } from 'react';
import { Button, Card } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

interface TutorialStepProps {
  onNext: () => void;
  onSkip?: () => void;
  onPrevious?: () => void;
}

export default function TutorialStep({
  onNext,
  onSkip,
  onPrevious,
}: TutorialStepProps) {
  const [currentDemo, setCurrentDemo] = useState<'products' | 'states' | 'map'>('products');

  // Alternar entre las tres animaciones cada 4 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDemo(prev => {
        if (prev === 'products') return 'states';
        if (prev === 'states') return 'map';
        return 'products';
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="text-center mb-4">
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}>
          <i className="bi bi-play-circle-fill text-white" style={{ fontSize: '2.5rem' }}></i>
        </div>
        <h3 className="mb-2" style={{ color: '#1a1a1a', fontWeight: 600 }}>Conoce CertyPass</h3>
        <p style={{ color: '#666', fontSize: '1rem' }}>
          Ve cómo crear productos y estados en el dashboard
        </p>
      </div>

      {/* Animación del Dashboard */}
      <div className="mb-4" style={{ 
        background: '#f8f9fa', 
        borderRadius: '12px', 
        padding: '0.75rem',
        border: '1px solid #e9ecef',
        minHeight: '360px',
        maxHeight: '420px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Simulación del Dashboard */}
        <div style={{ 
          display: 'flex', 
          height: '100%',
          position: 'relative',
          gap: '0'
        }}>
          {/* Sidebar */}
          <div style={{
            width: '160px',
            minWidth: '160px',
            background: '#ffffff',
            borderRight: '1px solid #e9ecef',
            padding: '0.75rem 0.5rem',
            position: 'relative',
            zIndex: 2,
            flexShrink: 0
          }}>
            {/* Logo placeholder */}
            <div style={{ 
              height: '40px', 
              background: '#667eea', 
              borderRadius: '6px',
              marginBottom: '1rem',
              opacity: 0.3
            }}></div>
            
            {/* Menú items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{
                padding: '0.5rem',
                borderRadius: '6px',
                background: currentDemo === 'products' ? '#e7f3ff' : 'transparent',
                transition: 'background 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <i className="bi bi-house" style={{ color: currentDemo === 'products' ? '#667eea' : '#666' }}></i>
                <span style={{ color: currentDemo === 'products' ? '#667eea' : '#666' }}>Inicio</span>
              </div>
              <div style={{
                padding: '0.5rem',
                borderRadius: '6px',
                background: currentDemo === 'products' ? '#e7f3ff' : 'transparent',
                transition: 'background 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                position: 'relative'
              }}>
                <i className="bi bi-list-columns" style={{ color: currentDemo === 'products' ? '#667eea' : '#666' }}></i>
                <span style={{ color: currentDemo === 'products' ? '#667eea' : '#666' }}>Productos</span>
                {currentDemo === 'products' && (
                  <div style={{
                    position: 'absolute',
                    right: '8px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#667eea',
                    animation: 'tutorialPulse 1.5s infinite'
                  }}></div>
                )}
              </div>
              <div style={{
                padding: '0.5rem',
                borderRadius: '6px',
                background: currentDemo === 'states' ? '#e7f3ff' : 'transparent',
                transition: 'background 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                position: 'relative'
              }}>
                <i className="bi bi-collection" style={{ color: currentDemo === 'states' ? '#667eea' : '#666' }}></i>
                <span style={{ color: currentDemo === 'states' ? '#667eea' : '#666' }}>Estados</span>
                {currentDemo === 'states' && (
                  <div style={{
                    position: 'absolute',
                    right: '8px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#667eea',
                    animation: 'tutorialPulse 1.5s infinite'
                  }}></div>
                )}
              </div>
              <div style={{
                padding: '0.5rem',
                borderRadius: '6px',
                background: currentDemo === 'map' ? '#e7f3ff' : 'transparent',
                transition: 'background 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                position: 'relative'
              }}>
                <i className="bi bi-geo-alt" style={{ color: currentDemo === 'map' ? '#667eea' : '#666' }}></i>
                <span style={{ color: currentDemo === 'map' ? '#667eea' : '#666' }}>Mapa</span>
                {currentDemo === 'map' && (
                  <div style={{
                    position: 'absolute',
                    right: '8px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#667eea',
                    animation: 'tutorialPulse 1.5s infinite'
                  }}></div>
                )}
              </div>
            </div>
          </div>

          {/* Contenido principal */}
          <div style={{ 
            flex: 1, 
            padding: '1rem',
            background: '#ffffff',
            position: 'relative',
            minWidth: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header con botón */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexShrink: 0
            }}>
              <div>
                <div style={{ 
                  height: '20px', 
                  width: '140px', 
                  background: '#e9ecef', 
                  borderRadius: '4px',
                  marginBottom: '0.4rem'
                }}></div>
                <div style={{ 
                  height: '14px', 
                  width: '100px', 
                  background: '#f1f3f5', 
                  borderRadius: '4px'
                }}></div>
              </div>
              {currentDemo !== 'map' && (
                <div style={{
                  padding: '0.4rem 0.75rem',
                  background: currentDemo === 'products' 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  animation: 'tutorialButtonPulse 2s infinite',
                  transition: 'transform 0.2s ease',
                  whiteSpace: 'nowrap'
                }}>
                  <i className="bi bi-plus-circle" style={{ fontSize: '0.875rem' }}></i>
                  {currentDemo === 'products' ? 'Nuevo Producto' : 'Nuevo Estado'}
                </div>
              )}
            </div>

            {/* Tabla/Lista simulada o Mapa */}
            {currentDemo !== 'map' ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem',
                flex: 1,
                overflowY: 'auto',
                minHeight: 0
              }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{
                    padding: '0.75rem',
                    background: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: '#dee2e6',
                      borderRadius: '6px',
                      flexShrink: 0
                    }}></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        height: '14px',
                        width: '60%',
                        background: '#e9ecef',
                        borderRadius: '4px',
                        marginBottom: '0.4rem'
                      }}></div>
                      <div style={{
                        height: '11px',
                        width: '40%',
                        background: '#f1f3f5',
                        borderRadius: '4px'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Mapa con trazas/hitos */
              <div style={{
                position: 'relative',
                width: '100%',
                height: '280px',
                background: '#fafafa',
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                overflow: 'hidden',
                flex: 1,
                minHeight: 0
              }}>
                {/* Mapa simplificado con solo calles verticales y horizontales */}
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                  {/* Fondo */}
                  <rect width="100%" height="100%" fill="#fafafa" />
                  
                  {/* Calles horizontales */}
                  <line x1="0" y1="70" x2="100%" y2="70" stroke="#d0d0d0" strokeWidth="3" />
                  <line x1="0" y1="140" x2="100%" y2="140" stroke="#d0d0d0" strokeWidth="3" />
                  <line x1="0" y1="210" x2="100%" y2="210" stroke="#d0d0d0" strokeWidth="3" />
                  
                  {/* Calles verticales */}
                  <line x1="80" y1="0" x2="80" y2="100%" stroke="#d0d0d0" strokeWidth="3" />
                  <line x1="160" y1="0" x2="160" y2="100%" stroke="#d0d0d0" strokeWidth="3" />
                  <line x1="240" y1="0" x2="240" y2="100%" stroke="#d0d0d0" strokeWidth="3" />
                </svg>

                {/* Hitos/Marcadores en el mapa */}
                {[
                  { x: '25%', y: '30%', label: 'Producto 1', color: '#667eea' },
                  { x: '50%', y: '50%', label: 'Producto 2', color: '#10b981' },
                  { x: '75%', y: '70%', label: 'Producto 3', color: '#f59e0b' },
                ].map((marker, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'absolute',
                      left: marker.x,
                      top: marker.y,
                      transform: 'translate(-50%, -50%)',
                      animation: `tutorialMarkerAppear 0.5s ease-out ${index * 0.2}s both`
                    }}
                  >
                    {/* Pin del marcador */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50% 50% 50% 0',
                      background: marker.color,
                      transform: 'rotate(-45deg)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: 'pointer'
                    }}>
                      <i 
                        className="bi bi-geo-alt-fill text-white" 
                        style={{ 
                          fontSize: '1rem',
                          transform: 'rotate(45deg)',
                          position: 'relative',
                          zIndex: 2
                        }}
                      ></i>
                    </div>
                    {/* Etiqueta del marcador */}
                    <div style={{
                      position: 'absolute',
                      top: '40px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#333',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      border: '1px solid #e9ecef'
                    }}>
                      {marker.label}
                    </div>
                    {/* Línea conectora (trazas) */}
                    {index > 0 && (
                      <svg 
                        style={{
                          position: 'absolute',
                          top: '16px',
                          left: '50%',
                          width: '100px',
                          height: '2px',
                          pointerEvents: 'none',
                          zIndex: 1
                        }}
                      >
                        <line
                          x1="0"
                          y1="0"
                          x2="100%"
                          y2="0"
                          stroke={marker.color}
                          strokeWidth="3"
                          strokeDasharray="5,5"
                          opacity="0.6"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Modal/Formulario que aparece (solo para productos y estados) */}
            {(currentDemo === 'products' || currentDemo === 'states') && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                maxWidth: '420px',
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                border: '1px solid #e9ecef',
                animation: 'tutorialModalAppear 0.5s ease-out',
                zIndex: 10,
                maxHeight: '85%',
                overflowY: 'auto'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <h5 style={{ margin: 0, color: '#1a1a1a', fontWeight: 600 }}>
                    {currentDemo === 'products' ? 'Nuevo Producto' : 'Nuevo Estado'}
                  </h5>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    background: '#f1f3f5',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Campo Nombre */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#333',
                      marginBottom: '0.5rem'
                    }}>
                      Nombre *
                    </label>
                    <div style={{
                      height: '42px',
                      width: '100%',
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 0.75rem',
                      color: '#666',
                      fontSize: '0.875rem'
                    }}>
                      {currentDemo === 'products' ? 'Mi Producto' : 'Estado Inicial'}
                    </div>
                  </div>

                  {/* Campo Descripción */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#333',
                      marginBottom: '0.5rem'
                    }}>
                      Descripción
                    </label>
                    <div style={{
                      height: '90px',
                      width: '100%',
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      color: '#666',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'flex-start'
                    }}>
                      {currentDemo === 'products' 
                        ? 'Descripción detallada del producto...' 
                        : 'Descripción del cambio de estado...'}
                    </div>
                  </div>

                  {/* Campos adicionales según el tipo */}
                  {currentDemo === 'products' ? (
                    <>
                      {/* Campo Categoría */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#333',
                          marginBottom: '0.5rem'
                        }}>
                          Categoría *
                        </label>
                        <div style={{
                          height: '42px',
                          width: '100%',
                          background: '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 0.75rem',
                          color: '#666',
                          fontSize: '0.875rem'
                        }}>
                          <i className="bi bi-chevron-down me-2" style={{ color: '#999' }}></i>
                          Seleccionar categoría...
                        </div>
                      </div>
                      {/* Campo Imagen */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#333',
                          marginBottom: '0.5rem'
                        }}>
                          Imagen
                        </label>
                        <div style={{
                          height: '100px',
                          width: '100%',
                          background: '#f8f9fa',
                          border: '2px dashed #dee2e6',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          color: '#999',
                          fontSize: '0.875rem'
                        }}>
                          <i className="bi bi-cloud-upload" style={{ fontSize: '1.5rem' }}></i>
                          <span>Arrastra una imagen o haz clic para seleccionar</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Campo Tipo de Estado */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#333',
                          marginBottom: '0.5rem'
                        }}>
                          Tipo de Estado *
                        </label>
                        <div style={{
                          height: '42px',
                          width: '100%',
                          background: '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 0.75rem',
                          color: '#666',
                          fontSize: '0.875rem'
                        }}>
                          <i className="bi bi-chevron-down me-2" style={{ color: '#999' }}></i>
                          Seleccionar tipo...
                        </div>
                      </div>
                      {/* Campo Producto asociado */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#333',
                          marginBottom: '0.5rem'
                        }}>
                          Producto *
                        </label>
                        <div style={{
                          height: '42px',
                          width: '100%',
                          background: '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 0.75rem',
                          color: '#666',
                          fontSize: '0.875rem'
                        }}>
                          <i className="bi bi-chevron-down me-2" style={{ color: '#999' }}></i>
                          Seleccionar producto...
                        </div>
                      </div>
                      {/* Campo Evidencias/Fotos */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#333',
                          marginBottom: '0.5rem'
                        }}>
                          Evidencias / Fotos
                        </label>
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          {[1, 2, 3].map((i) => (
                            <div key={i} style={{
                              width: '80px',
                              height: '80px',
                              background: '#f8f9fa',
                              border: '1px solid #e9ecef',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#999',
                              fontSize: '0.75rem'
                            }}>
                              <i className="bi bi-image"></i>
                            </div>
                          ))}
                          <div style={{
                            width: '80px',
                            height: '80px',
                            background: '#f8f9fa',
                            border: '2px dashed #dee2e6',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#999',
                            fontSize: '1.5rem'
                          }}>
                            <i className="bi bi-plus"></i>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Botones de acción */}
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    marginTop: '0.5rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #e9ecef'
                  }}>
                    <button style={{
                      flex: 1,
                      height: '42px',
                      background: '#f1f3f5',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}>
                      Cancelar
                    </button>
                    <button style={{
                      flex: 1,
                      height: '42px',
                      background: currentDemo === 'products'
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}>
                      {currentDemo === 'products' ? 'Crear Producto' : 'Crear Estado'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Indicadores */}
      <div className="d-flex justify-content-center gap-2 mb-4">
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: currentDemo === 'products' ? '#667eea' : '#dee2e6',
          transition: 'background 0.3s ease'
        }}></div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: currentDemo === 'states' ? '#10b981' : '#dee2e6',
          transition: 'background 0.3s ease'
        }}></div>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: currentDemo === 'map' ? '#667eea' : '#dee2e6',
          transition: 'background 0.3s ease'
        }}></div>
      </div>

      <div className="d-flex flex-column gap-2">
        <Button
          onClick={onNext}
          className="w-100"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            padding: '12px'
          }}
        >
          Continuar
          <i className="bi bi-arrow-right ms-2"></i>
        </Button>
        {onPrevious && (
          <Button
            variant="outline-secondary"
            onClick={onPrevious}
            className="w-100"
            style={{ borderRadius: '8px', fontWeight: 500 }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Anterior
          </Button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes tutorialPulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.2);
            }
          }

          @keyframes tutorialButtonPulse {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            50% {
              transform: scale(1.05);
              box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
            }
          }

          @keyframes tutorialModalAppear {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.9);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }

          @keyframes tutorialMarkerAppear {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0);
            }
            50% {
              transform: translate(-50%, -50%) scale(1.2);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }

        `
      }} />
    </div>
  );
}
