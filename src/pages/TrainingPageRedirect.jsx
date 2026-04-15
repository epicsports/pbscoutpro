import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * TrainingPageRedirect — redirects /training/:trainingId to MainPage
 * with the correct training context set in localStorage.
 * Preserves backward compatibility with old routes and MatchPage back buttons.
 */
export default function TrainingPageRedirect() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (trainingId) {
      try {
        localStorage.setItem('pbscoutpro_lastKind', 'training');
        localStorage.setItem('pbscoutpro_lastTraining', trainingId);
        localStorage.removeItem('pbscoutpro_activeTournament');
      } catch {}
    }
    navigate('/', { replace: true });
  }, [trainingId, navigate]);
  return null;
}
