import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { updateAnnuaire, deleteAnnuaire } from './services/annuaireService';
import { Modal } from './components/communs/Modal';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import {
  StatusDossier, TabId,
  Dossier, TypeDossier, SousTypeDossier, CategorieAssociation, DossierUpdatePayload, AnnuaireEntry, FormDossier,
  joinCategories, parseCategories, createDossier as createDossierObject
} from './types';
import { downloadDocxFromTemplate } from './services/docxService';
import { useDossiers } from './hooks/useDossiers';
import { corrigerDefavorable } from './services/dossierService';
import {
  createDossier,
  updateDossier,
  updateDossierComplet,
  deleteDossier,
  addHistoriqueDefavorable,
} from './services/dossierService';
import { archiverArrivee } from './services/historiqueArriveeService';
import { resetAll } from './services/resetService';
import { initSocket } from './services/socket';

import { AuditJournal } from './components/audit/AuditJournal';
// Section components (direct imports to preserve TypeScript prop types)
import { DashboardSection } from './components/dashboard/DashboardSection';
import { ReceptionSection } from './components/reception/ReceptionSection';
import { EnAttenteSection } from './components/enAttente/EnAttenteSection';
import { EnCoursSection } from './components/enCours/EnCoursSection';
import { LivraisonSection } from './components/livraison/LivraisonSection';
import { AnnuaireSection } from './components/annuaire/AnnuaireSection';
import { RegistreChronoSection } from './components/registreChrono/RegistreChronoSection';
import { StockDefavorableSection } from './components/defavorable/StockDefavorableSection';
import { HistoriqueDefavorableSection } from './components/historiqueDefavorable/HistoriqueDefavorableSection';
import { HistoriqueSortieSection } from './components/historiqueSortie/HistoriqueSortieSection';
import { HistoriqueArriveeSection } from './components/historiqueArrivee/HistoriqueArriveeSection';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('token') !== null;
  });

  const [currentTab, setCurrentTab] = useState<TabId>('reception');
  const { dossiers, loading, error, fetchDossiers } = useDossiers(isAuthenticated);

  const [newDossier, setNewDossier] = useState<FormDossier>({
    numArrivee: '',
    nom: '',
    siege: '',
    objet: '',
    district: '',
    president: '',
    abreviation: '',
    type: 'Création' as TypeDossier,
    sous_type: '' as SousTypeDossier,
    dateArrivee: new Date().toISOString().split('T')[0],
    heureArrivee: new Date().toTimeString().slice(0, 5),
    selectedCategories: [],
    customCategory: '',
    emplacement: '',
    arn: '',
    recuFr: '',
    recuMg: '',
  });

  const [showPdfAnnuaireModal, setShowPdfAnnuaireModal] = useState(false);
  const [pdfAnnuaireZoom, setPdfAnnuaireZoom] = useState(1);
  const [pdfAnnuaireUrl] = useState<string | null>(null);

  const [lignesSupplementairesAssoc, setLignesSupplementairesAssoc] = useState('');
  const [dossiersTelecharges, setDossiersTelecharges] = useState<Set<number>>(new Set());
  const [refreshHistoDef, setRefreshHistoDef] = useState(0);
  const [refreshHistoSortie, setRefreshHistoSortie] = useState(0);
  const [refreshAnnuaire, setRefreshAnnuaire] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 900;
  });

  const sessionUser = sessionStorage.getItem('user');
  const currentUser = sessionUser ? JSON.parse(sessionUser) : null;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 900) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const onAuthExpired = () => {
      setIsAuthenticated(false);
      alert('Session expirée, veuillez vous reconnecter.');
    };
    window.addEventListener('auth:expired', onAuthExpired as EventListener);
    return () => window.removeEventListener('auth:expired', onAuthExpired as EventListener);
  }, []);

  useEffect(() => {
    const socket = initSocket();
    const handleAnnuaireChanged = () => setRefreshAnnuaire(prev => prev + 1);
    const handleDossiersChanged = () => fetchDossiers();

    socket?.on('annuaire:changed', handleAnnuaireChanged);
    socket?.on('annuaire:groupCreated', handleAnnuaireChanged);
    socket?.on('annuaire:associationAdded', handleAnnuaireChanged);
    socket?.on('dossiers:archived', handleDossiersChanged);
    socket?.on('dossiers:created', handleDossiersChanged);
    socket?.on('dossiers:updated', handleDossiersChanged);
    socket?.on('dossiers:deleted', handleDossiersChanged);

    return () => {
      socket?.off('annuaire:changed', handleAnnuaireChanged);
      socket?.off('annuaire:groupCreated', handleAnnuaireChanged);
      socket?.off('annuaire:associationAdded', handleAnnuaireChanged);
      socket?.off('dossiers:archived', handleDossiersChanged);
      socket?.off('dossiers:created', handleDossiersChanged);
      socket?.off('dossiers:updated', handleDossiersChanged);
      socket?.off('dossiers:deleted', handleDossiersChanged);
    };
  }, [fetchDossiers]);

  const handleAddDossier = async (status: StatusDossier = 'reception') => {
  if (!newDossier.numArrivee.trim() || !newDossier.nom.trim()) return;

  const siegeLines = newDossier.siege.split('\n').filter(line => line.trim() !== '');
  const districtExtrait = siegeLines.length > 0 ? siegeLines.pop()!.trim() : '';
  const siegeSansDistrict = siegeLines.join('\n');

  // Calculer la catégorie finale à partir des catégories multiples
  const parts: string[] = [...newDossier.selectedCategories];
  if ((newDossier.customCategory || '').trim()) {
    parts.push((newDossier.customCategory || '').trim());
  }
  const categorieFinale = joinCategories(parts);

  const dossierToSend = {
    num_chrono: newDossier.numArrivee,
    nom_association: newDossier.nom,
    siege: siegeSansDistrict,
    district: districtExtrait,
    president: newDossier.president,
    type_dossier: newDossier.type,
    sous_type: newDossier.sous_type || '',
    date_depot: newDossier.dateArrivee,
    heure_depot: newDossier.heureArrivee,
    categorie: categorieFinale,
    arn: newDossier.arn,
    recu_fr: newDossier.recuFr,
    recu_mg: newDossier.recuMg,
    objet: newDossier.objet,
    abreviation: lignesSupplementairesAssoc,
    status,
  };

  try {
    await createDossier(dossierToSend);
    await fetchDossiers();

    // Réinitialiser le formulaire
    setNewDossier(prev => ({
      ...prev,
      numArrivee: '',
      nom: '',
      siege: '',
      district: '',
      president: '',
      type: 'Création',
      dateArrivee: new Date().toISOString().split('T')[0],
      heureArrivee: new Date().toTimeString().slice(0, 5),
      selectedCategories: [],
      customCategory: '',
      arn: '',
      recuFr: '',
      recuMg: '',
      objet: '',
    }));
    setLignesSupplementairesAssoc('');
  } catch (err: any) {
    // ============================================================
    // ⚠️ AJOUT : GESTION DE L'ERREUR 409 (DOUBLON)
    // ============================================================
    if (err.response && err.response.status === 409) {
      const msg = err.response.data?.error || 'Ce numéro d\'arrivée existe déjà dans un dossier actif.';
      // Afficher un toast avec react-hot-toast (déjà importé)
      toast.error(msg);
      // On peut aussi afficher un alert() si on préfère
      // alert(msg);
      console.warn('⚠️ Doublon détecté :', err.response.data);
    } else {
      console.error(err);
      toast.error('Erreur lors de l\'ajout du dossier.');
    }
    // ============================================================
    // FIN DE L'AJOUT
    // ============================================================
  }
};

  const handleVerdict = async (id: number, verdict: 'favorable' | 'defavorable') => {
    try {
      await updateDossier(id, {
        verdict,
        status: verdict === 'favorable' ? 'en_attente' : 'defavorable',
      });
      await fetchDossiers();
    } catch (err) { console.error(err); }
  };

  const verifyPassword = async (reason: string): Promise<boolean> => {
    const mdp = window.prompt(reason);
    if (!mdp) return false;
    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({ password: mdp }),
      });
      if (!res.ok) throw new Error('Mot de passe incorrect');
      const data = await res.json();
      return data.valid === true;
    } catch {
      alert('Mot de passe incorrect.');
      return false;
    }
  };

  const handleUndo = async (id: number) => {
    const ok = await verifyPassword('Mot de passe pour annuler le verdict :');
    if (!ok) return;
    try {
      await updateDossier(id, { status: 'reception', verdict: 'aucun' });
      await fetchDossiers();
    } catch (err) {
      console.error('Erreur handleUndo :', err);
    }
  };

  const handleUndoEnAttente = async (id: number) => {
    const ok = await verifyPassword('Mot de passe pour retourner à la réception :');
    if (!ok) return;
    try {
      await updateDossier(id, { status: 'reception', verdict: 'aucun' });
      await fetchDossiers();
    } catch (err) {
      console.error('Erreur handleUndoEnAttente :', err);
    }
  };

  const handleEdit = async (id: number, updatedData: DossierUpdatePayload): Promise<void> => {
    try {
      await updateDossierComplet(id, updatedData);
      await fetchDossiers();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer ce dossier ?')) return;
    try {
      await deleteDossier(id);
      await fetchDossiers();
    } catch (err) { console.error(err); }
  };

  const handleEnvoyerEnCours = async (id: number) => {
    try {
      await updateDossier(id, { status: 'en_cours' });
      await fetchDossiers();
    } catch (err) { console.error(err); }
  };

  const handleEditAnnuaire = async (association: AnnuaireEntry): Promise<void> => {
    const newNom = prompt("Modifier le nom de l'association", association.nom_association || '');
    if (newNom && newNom !== association.nom_association) {
      try {
        await updateAnnuaire(association.id, { nom_association: newNom });
        setRefreshAnnuaire(prev => prev + 1);
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la modification");
      }
    }
  };

  const handleDeleteAnnuaire = async (id: number) => {
    if (!window.confirm("Supprimer définitivement cette association de l'annuaire ?")) return;
    try {
      await deleteAnnuaire(id);
      setRefreshAnnuaire(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleRetourPile = async (id: number) => {
    try {
      await updateDossier(id, { status: 'en_attente' });
      await fetchDossiers();
    } catch (err) { console.error(err); }
  };

  const handleLivrer = async (id: number) => {
    const numeroSortie = window.prompt('Numéro de sortie :');
    if (numeroSortie === null) return;
    try {
      await updateDossier(id, { status: 'livraison', numero_sortie: numeroSortie });
      await fetchDossiers();
    } catch (err) { console.error(err); }
  };

  const handleSortie = async (id: number) => {
    const personne = window.prompt('Nom de la personne ayant pris le dossier :');
    if (personne === null) return;
    try {
      await updateDossier(id, { status: 'historique_sortie', personne_sortie: personne });
      await fetchDossiers();
      setRefreshHistoSortie(prev => prev + 1);
    } catch (err) { console.error(err); }
  };

const handleCorrigerDefavorable = async (id: number) => {
  const dossier = dossiers.find(d => d.id === id);
  if (!dossier) return;
  const nomPersonne = prompt('Nom de la personne qui a corrigé ?', 'Agent');
  if (!nomPersonne) return;
  const now = new Date();
  const date_prise = now.toISOString().split('T')[0];
  const heure_prise = now.toTimeString().slice(0, 5);

  try {
    // ✅ FIX C4 : Appel unique et atomique
    await corrigerDefavorable(id, { nomPersonne, date_prise, heure_prise });
    await fetchDossiers();
    setRefreshHistoDef(prev => prev + 1);
    toast.success('✅ Dossier corrigé et historié');
  } catch (err: any) {
    console.error('❌ Erreur lors de la correction :', err);
    toast.error(err.response?.data?.error || 'Erreur lors de la correction');
  }
};

  const handleArchiveArrivee = async () => {
    const periode = prompt('Période (ex: Avril 2026) :');
    if (!periode) return;
    try {
      const result = await archiverArrivee(periode);
      await fetchDossiers();
      alert(result.message || '✅ Archivage terminé !');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("⚠️ Cela va supprimer TOUS les dossiers, l'annuaire et l'historique. Confirmez-vous ?")) return;
    const mdp = window.prompt('Mot de passe pour réinitialiser toutes les données :');
    if (!mdp) return;
    try {
      const result = await resetAll(mdp);
      await fetchDossiers();
      alert(result.message || '✅ Réinitialisation terminée.');
    } catch (err: any) {
      alert('❌ ' + (err.message || 'Erreur lors de la réinitialisation'));
      console.error(err);
    }
  };

  const handleDownloadDocxDossier = async (dossier: Dossier) => {
    try {
      const arnLines = (dossier.arn || '').split('\n').filter(l => l.trim());

      const data: Record<string, string> = {
        nom: dossier.nom,
        abreviation: dossier.sigle || '',
        siege: dossier.siege || '',
        district: dossier.district || '',
        president: dossier.president || '',
        objet: dossier.objet || '',
        arn_l1: arnLines[0] || '',
        arn_l2: arnLines[1] || '',
        arn_l3: arnLines[2] || '',
        arn_l4: arnLines[3] || '',
        recu_fr: dossier.recuFr || '',
        recu_mg: dossier.recuMg || '',
      };

      const templatePath = dossier.type === 'Création'
        ? '/assets/modele_creation.docx'
        : '/assets/modele_renouvellement.docx';
      const fileName = `${dossier.nom.replace(/\s+/g, '_')} (${dossier.numArrivee.replace(/[\\/:*?"<>|]/g, '_')}).docx`;

      await downloadDocxFromTemplate(templatePath, data, fileName);
      setDossiersTelecharges(prev => new Set(prev).add(dossier.id));
    } catch (error) {
      console.error('Erreur génération DOCX', error);
      alert('Impossible de générer le document Word.');
    }
  };

  const handleRenouveler = (dossier: Dossier): void => {
    const siegeComplet = dossier.district
      ? (dossier.siege ? dossier.siege + '\n' + dossier.district : dossier.district)
      : (dossier.siege || '');
    const existingCategories = parseCategories(dossier.categorie || '');
    setNewDossier(prev => ({
      ...prev,
      nom: dossier.nom || '',
      siege: siegeComplet,
      district: '',
      president: dossier.president || '',
      selectedCategories: existingCategories,
      customCategory: '',
      objet: dossier.objet || '',
      arn: dossier.arn || '',
      recuFr: dossier.recuFr || '',
      recuMg: dossier.recuMg || '',
      type: 'Renouvellement',
      numArrivee: '',
      dateArrivee: new Date().toISOString().split('T')[0],
      heureArrivee: new Date().toTimeString().slice(0, 5),
    }));
    setLignesSupplementairesAssoc(dossier.abreviation || dossier.sigle || '');
    setCurrentTab('reception');
  };

  const handleDuplicata = (dossier: Dossier): void => {
    const siegeComplet = dossier.district
      ? (dossier.siege ? dossier.siege + '\n' + dossier.district : dossier.district)
      : (dossier.siege || '');
    const existingCategories = parseCategories(dossier.categorie || '');
    setNewDossier(prev => ({
      ...prev,
      numArrivee: '',
      nom: dossier.nom || '',
      siege: siegeComplet,
      district: '',
      president: dossier.president || '',
      type: dossier.type as TypeDossier,
      selectedCategories: existingCategories,
      customCategory: '',
      arn: dossier.arn || '',
      recuFr: dossier.recuFr || '',
      recuMg: dossier.recuMg || '',
      objet: dossier.objet || '',
      dateArrivee: new Date().toISOString().split('T')[0],
      heureArrivee: new Date().toTimeString().slice(0, 5),
    }));
    setLignesSupplementairesAssoc(dossier.abreviation || dossier.sigle || '');
    setCurrentTab('reception');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex vh-screen bg-gradient-to-br from-slate-50 to-sky-100">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onReset={handleReset}
      />

      <main className="flex-1 p-6 overflow-auto">
        <Header
          loading={loading}
          error={error}
          currentUser={currentUser}
          onToggleSidebar={() => setSidebarOpen(s => !s)}
          onLogout={handleLogout}
        />

        <div style={{ display: currentTab === 'reception' ? 'block' : 'none' }}>
          <ReceptionSection
            newDossier={newDossier}
            setNewDossier={setNewDossier}
            onAdd={handleAddDossier}
            dossiers={dossiers}
            onVerdict={handleVerdict}
            onDelete={handleDelete}
            onArchive={handleArchiveArrivee}
            lignesSupplementairesAssoc={lignesSupplementairesAssoc}
            setLignesSupplementairesAssoc={setLignesSupplementairesAssoc}
            onUndo={handleUndo}
            onEdit={handleEdit}
            onRefresh={fetchDossiers}
          />
        </div>

        <div style={{ display: currentTab === 'en_attente' ? 'block' : 'none' }}>
          <EnAttenteSection
            dossiers={dossiers}
            onEnvoyerEnCours={handleEnvoyerEnCours}
            onDownloadDocx={handleDownloadDocxDossier}
            dossiersTelecharges={dossiersTelecharges}
            newDossier={newDossier}
            setNewDossier={setNewDossier}
            onAdd={() => handleAddDossier('en_attente')}
            lignesSupplementairesAssoc={lignesSupplementairesAssoc}
            setLignesSupplementairesAssoc={setLignesSupplementairesAssoc}
            onUndo={handleUndoEnAttente}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        </div>

        <div style={{ display: currentTab === 'en_cours' ? 'block' : 'none' }}>
          <EnCoursSection dossiers={dossiers} onRetourPile={handleRetourPile} onLivrer={handleLivrer} onEdit={handleEdit} />
        </div>

        <div style={{ display: currentTab === 'dashboard' ? 'block' : 'none' }}>
          <DashboardSection onTabChange={setCurrentTab} />
        </div>

        <div style={{ display: currentTab === 'defavorable' ? 'block' : 'none' }}>
          <StockDefavorableSection dossiers={dossiers} onRepasserEnReception={handleCorrigerDefavorable} />
        </div>

        <div style={{ display: currentTab === 'livraison' ? 'block' : 'none' }}>
          <LivraisonSection dossiers={dossiers} onSortie={handleSortie} />
        </div>

        <div style={{ display: currentTab === 'historique_sortie' ? 'block' : 'none' }}>
          <HistoriqueSortieSection refreshKey={refreshHistoSortie} />
        </div>

        <div style={{ display: currentTab === 'historique_arrivee' ? 'block' : 'none' }}>
          <HistoriqueArriveeSection />
        </div>

        <div style={{ display: currentTab === 'audit' ? 'block' : 'none' }}>
          <AuditJournal />
        </div>

        <div style={{ display: currentTab === 'registre_chrono' ? 'block' : 'none' }}>
          <RegistreChronoSection
            dossiers={dossiers.filter(d =>
              d.status === 'archive_arrivee' ||
              d.status === 'historique_sortie' ||
              d.status === 'defavorable_traite' ||
              d.status === 'registre_chrono'
            )}
            onRefresh={async () => { await fetchDossiers(); setRefreshAnnuaire(prev => prev + 1); }}
          />
        </div>

        <div style={{ display: currentTab === 'annuaire' ? 'block' : 'none' }}>
          <AnnuaireSection
            onEdit={handleEditAnnuaire}
            onDelete={handleDeleteAnnuaire}
            refreshKey={refreshAnnuaire}
            onRenouveler={(a: AnnuaireEntry) => handleRenouveler(
              createDossierObject({
                id: a.id,
                num_chrono: a.num_chrono || '',
                nom_association: a.nom_association || '',
                siege: a.siege || '',
                district: a.district || '',
                president: a.president || '',
                abreviation: a.abreviation || '',
                type_dossier: (a.type_dossier || 'Création') as TypeDossier,
                objet: a.objet || '',
                date_depot: a.date_depot || new Date().toISOString().split('T')[0],
                heure_depot: a.heure_depot || '',
                status: 'reception',
                verdict: 'aucun',
                categorie: a.categorie || 'Autre',
                arn: '',
                recu_fr: '',
                recu_mg: '',
                emplacement: '',
              })
            )}
            onDuplicata={(a: AnnuaireEntry) => handleDuplicata(
              createDossierObject({
                id: a.id,
                num_chrono: a.num_chrono || '',
                nom_association: a.nom_association || '',
                siege: a.siege || '',
                district: a.district || '',
                president: a.president || '',
                abreviation: a.abreviation || '',
                type_dossier: (a.type_dossier || 'Création') as TypeDossier,
                objet: a.objet || '',
                date_depot: a.date_depot || new Date().toISOString().split('T')[0],
                heure_depot: a.heure_depot || '',
                status: 'reception',
                verdict: 'aucun',
                categorie: a.categorie || 'Autre',
                arn: '',
                recu_fr: '',
                recu_mg: '',
                emplacement: '',
              })
            )}
          />
        </div>

        <div style={{ display: currentTab === 'historique_defavorable' ? 'block' : 'none' }}>
          <HistoriqueDefavorableSection refreshKey={refreshHistoDef} />
        </div>
      </main>

      <Modal show={showPdfAnnuaireModal} onClose={() => setShowPdfAnnuaireModal(false)} title="PDF Association">
        <div className="mb-2 flex items-center gap-2">
          <button onClick={() => setPdfAnnuaireZoom(z => Math.min(3, z + 0.2))} className="px-2 py-1 text-sm bg-white/20 rounded">🔍+</button>
          <button onClick={() => setPdfAnnuaireZoom(z => Math.max(0.5, z - 0.2))} className="px-2 py-1 text-sm bg-white/20 rounded">🔍-</button>
          <button onClick={() => setPdfAnnuaireZoom(1)} className="px-2 py-1 text-sm bg-white/20 rounded">↺</button>
          <span className="ml-2 text-sm">Zoom: {Math.round(pdfAnnuaireZoom * 100)}%</span>
        </div>
        {pdfAnnuaireUrl && (
          <div className="overflow-auto max-h-[70vh] border border-slate-200">
            <div style={{ transform: `scale(${pdfAnnuaireZoom})`, transformOrigin: 'top left', width: 'fit-content' }}>
              <iframe src={pdfAnnuaireUrl} width="800" height="500" title="PDF Association" style={{ border: 'none' }} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;
