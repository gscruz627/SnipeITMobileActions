import { HashRouter as Router, Routes, Route} from 'react-router-dom';
import Home from './Home';
import Settings from './Settings';
import "./App.css"
function App(){
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
};

export default App;