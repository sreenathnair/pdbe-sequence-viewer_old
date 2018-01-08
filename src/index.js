import PDBeSequenceViewer from './pdbe-sequence-viewer';

const loadComponent = function() {
    customElements.define('pdbe-sequence-viewer', PDBeSequenceViewer);
};
// Conditional loading of polyfill
if (window.customElements) {
    loadComponent();
} else {
    document.addEventListener('WebComponentsReady', function() {
        loadComponent();
    });
}

export default PDBeSequenceViewer;
