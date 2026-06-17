import { vi } from 'vitest';
import React from 'react';

// Mock para react-bootstrap components
vi.mock('react-bootstrap', () => ({
  Modal: ({ children, show, onHide, centered }: any) => 
    show ? React.createElement('div', { 
      'data-testid': 'modal', 
      'data-centered': centered 
    }, [
      React.createElement('div', { 'data-testid': 'modal-header', key: 'header' }, [
        React.createElement('button', { 
          'data-testid': 'modal-close', 
          onClick: onHide,
          key: 'close'
        }, '×')
      ]),
      React.createElement('div', { 'data-testid': 'modal-body', key: 'body' }, children),
      React.createElement('div', { 'data-testid': 'modal-footer', key: 'footer' })
    ]) : null,
  
  ModalHeader: ({ children, closeButton }: any) => 
    React.createElement('div', { 
      'data-testid': 'modal-header', 
      'data-close-button': closeButton 
    }, children),
  
  ModalBody: ({ children }: any) => 
    React.createElement('div', { 'data-testid': 'modal-body' }, children),
  
  ModalFooter: ({ children }: any) => 
    React.createElement('div', { 'data-testid': 'modal-footer' }, children),
  
  ModalTitle: ({ children }: any) => 
    React.createElement('h5', { 'data-testid': 'modal-title' }, children),
  
  Button: ({ children, onClick, disabled, variant, size, className }: any) => 
    React.createElement('button', { 
      onClick, 
      disabled, 
      'data-variant': variant,
      'data-size': size,
      className,
      'data-testid': 'button'
    }, children),
  
  ButtonGroup: ({ children, size, className }: any) => 
    React.createElement('div', { 
      'data-testid': 'button-group', 
      'data-size': size, 
      className 
    }, children),
  
  Spinner: ({ animation, role }: any) => 
    React.createElement('div', { 
      'data-testid': 'spinner', 
      'data-animation': animation, 
      role 
    }),
  
  Alert: ({ children, variant, className }: any) => 
    React.createElement('div', { 
      'data-testid': 'alert', 
      'data-variant': variant, 
      className 
    }, children),
  
  Form: ({ children, onSubmit }: any) => 
    React.createElement('form', { onSubmit, 'data-testid': 'form' }, children),
  
  Card: Object.assign(
    ({ children, className }: any) => 
      React.createElement('div', { 'data-testid': 'card', className }, children),
    {
      Body: ({ children, className }: any) => 
        React.createElement('div', { 'data-testid': 'card-body', className }, children),
    }
  ),
  
  CardBody: ({ children, className }: any) => 
    React.createElement('div', { 'data-testid': 'card-body', className }, children),
  
  Col: ({ children, md, className }: any) => 
    React.createElement('div', { 'data-testid': 'col', 'data-md': md, className }, children),
  
  Row: ({ children, className }: any) => 
    React.createElement('div', { 'data-testid': 'row', className }, children),
  
  Stack: ({ children, direction, gap, className }: any) => 
    React.createElement('div', { 
      'data-testid': 'stack', 
      'data-direction': direction, 
      'data-gap': gap, 
      className 
    }, children),
  
  ListGroup: ({ children }: any) => 
    React.createElement('div', { 'data-testid': 'list-group' }, children),
}));
