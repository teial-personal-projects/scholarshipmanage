import { useEffect, useState, useRef } from 'react';
import { apiDelete } from '../services/api';
import type { CollaboratorResponse } from '@scholarship-hub/shared';
import CollaboratorForm from '../components/CollaboratorForm';
import { useToastHelpers } from '../utils/toast';
import { useCollaborators } from '../hooks/useCollaborators';

function Collaborators() {
  const { showSuccess, showError } = useToastHelpers();
  const { collaborators, loading, fetchCollaborators } = useCollaborators();
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorResponse | null>(null);
  const [deleteCollaboratorId, setDeleteCollaboratorId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { fetchCollaborators(); }, [fetchCollaborators]);

  const handleAddCollaborator = () => { setSelectedCollaborator(null); setIsFormOpen(true); };
  const handleEditCollaborator = (c: CollaboratorResponse) => { setSelectedCollaborator(c); setIsFormOpen(true); };
  const handleDeleteClick = (id: number) => { setDeleteCollaboratorId(id); setIsDeleteOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!deleteCollaboratorId) return;
    try {
      await apiDelete(`/collaborators/${deleteCollaboratorId}`);
      showSuccess('Success', 'Collaborator deleted successfully', 3000);
      await fetchCollaborators();
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to delete collaborator');
    } finally {
      setDeleteCollaboratorId(null);
      setIsDeleteOpen(false);
    }
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col items-center gap-4">
      <div className="spinner w-10 h-10" />
      <p className="text-gray-600 text-sm">Loading collaborators...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900">Collaborators</h1>
        <button className="btn-primary" onClick={handleAddCollaborator}>Add Collaborator</button>
      </div>

      {collaborators.length === 0 ? (
        <p className="text-gray-500 text-sm">No collaborators yet. Add your first collaborator to get started.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden md:block overflow-x-auto">
            <table className="table-root">
              <thead>
                <tr className="table-header-row">
                  <th className="table-th">Name</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Relationship</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collaborators.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-[#F2F4EC]">
                    <td className="table-td font-semibold">{c.firstName} {c.lastName}</td>
                    <td className="table-td">{c.emailAddress}</td>
                    <td className="table-td">{c.relationship ? <span className="badge badge-blue">{c.relationship}</span> : <span className="text-gray-400">-</span>}</td>
                    <td className="table-td">{c.phoneNumber || '-'}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button className="btn-ghost text-xs px-2 py-1" onClick={() => handleEditCollaborator(c)}>Edit</button>
                        <button className="btn-ghost text-xs px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => handleDeleteClick(c.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {collaborators.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800">{c.firstName} {c.lastName}</p>
                    <p className="text-sm text-gray-600 mt-0.5 break-all">{c.emailAddress}</p>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {c.relationship && <span className="badge badge-blue text-xs">{c.relationship}</span>}
                      {c.phoneNumber && <span className="text-xs text-gray-600">{c.phoneNumber}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost text-xs px-2 py-1" onClick={() => handleEditCollaborator(c)}>Edit</button>
                    <button className="btn-ghost text-xs px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => handleDeleteClick(c.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CollaboratorForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        collaborator={selectedCollaborator}
        onSuccess={() => fetchCollaborators()}
      />

      {isDeleteOpen && (
        <div className="modal-backdrop" onClick={() => setIsDeleteOpen(false)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-semibold text-gray-900">Delete Collaborator</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setIsDeleteOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-gray-700">Are you sure you want to delete this collaborator? This will also remove all associated collaborations. This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button ref={cancelRef} className="btn-outline" onClick={() => setIsDeleteOpen(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Collaborators;
