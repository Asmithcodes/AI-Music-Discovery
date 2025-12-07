import React from 'react';

const Footer = () => {
    return (
        <footer style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.9rem',
            position: 'relative',
            zIndex: 10
        }}>
            <p>
                Developed by Asmith — <a
                    href="mailto:asmyth@duck.com"
                    style={{
                        color: 'var(--primary-color)',
                        textDecoration: 'none',
                        transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--secondary-color)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--primary-color)'}
                >
                    asmyth@duck.com
                </a>
            </p>
        </footer>
    );
};

export default Footer;
