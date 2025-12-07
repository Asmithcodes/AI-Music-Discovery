import React from 'react';
import InteractiveBackground from '../components/InteractiveBackground';
import Footer from '../components/Footer';

const MainLayout = ({ children }) => {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'grid',
            gridTemplateRows: '1fr auto',
            position: 'relative',
        }}>

            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                <InteractiveBackground />
            </div>
            <main style={{
                display: 'grid',
                placeItems: 'center',
                padding: '2rem',
                width: '100%',
                zIndex: 1
            }}>
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;
