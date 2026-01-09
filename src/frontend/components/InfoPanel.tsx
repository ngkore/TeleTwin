/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


import React from 'react';
import { SvgClose } from "@itwin/itwinui-icons-react";
import { theme } from '../theme/theme';

interface InfoPanelProps {
  title: string;
  message: string;
  onClose: () => void;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  title,
  message,
  onClose,
  type = 'info'
}) => {
  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'error': return theme.colors.error;
      default: return theme.colors.success;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success': return theme.colors.success;
      case 'warning': return theme.colors.warning;
      case 'error': return theme.colors.error;
      default: return theme.colors.info;
    }
  };

  const getTextColor = () => {
    return theme.colors.textPrimary;
  };

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: "80px",
    right: "20px",
    width: "400px",
    maxWidth: "90vw",
    backgroundColor: getBackgroundColor(),
    border: `2px solid ${getBorderColor()}`,
    borderRadius: theme.borderRadius.medium,
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    zIndex: 2000,
    color: getTextColor(),
    fontFamily: "Inter, system-ui, sans-serif",
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '16px',
    paddingLeft: '20px',
    gap: '20px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: 0,
    flex: 1
  };

  const messageStyle: React.CSSProperties = {
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
    overflowWrap: 'break-word',
    paddingLeft: '20px'
    
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    paddingRight: '20px',
    borderRadius: '4px',
    color: "white",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <button
          style={closeButtonStyle}
          onClick={onClose}
          onMouseEnter={(e) => {
            // e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <SvgClose color='white'/>
        </button>
      </div>
      <p style={messageStyle}>{message}</p>
    </div>
  );
};