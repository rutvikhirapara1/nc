'use client';

import {AlertTriangle,CheckCircle2,Archive,LogOut,Trash2,X} from 'lucide-react';
import Modal from './modal';

type ConfirmAction =
  | {type:'payment'; billNumber:string; nextStatus:'paid'|'pending'}
  | {type:'delete'; billNumber:string}
  | {type:'archiveVendor'; vendorName:string}
  | {type:'signout'}
  | null;

export default function ConfirmDialog({
  action,
  loading=false,
  onCancel,
  onConfirm,
}:{
  action:ConfirmAction;
  loading?:boolean;
  onCancel:()=>void;
  onConfirm:()=>void;
}) {
  if(!action) return null;

  const isDelete=action.type==='delete';
  const isPaid=action.type==='payment'&&action.nextStatus==='paid';
  const isArchive=action.type==='archiveVendor';
  const isSignout=action.type==='signout';

  const title=
    isDelete ? 'Delete bill?' :
    isArchive ? 'Archive vendor?' :
    isSignout ? 'Sign out?' :
    isPaid ? 'Mark bill as paid?' :
    'Move bill back to pending?';

  const description=
    isDelete ? 'This action cannot be undone.' :
    isArchive ? 'The vendor will be removed from your active vendor list. Existing bill records remain unchanged.' :
    isSignout ? 'You will be signed out of VendorPay on this device.' :
    isPaid ? 'This will record today as the payment date.' :
    'The bill will become pending again and the paid date will be cleared.';

  const tone=isDelete||isArchive||isSignout?'red':isPaid?'emerald':'amber';

  const toneBox=tone==='red'?'border-red-100 bg-red-50':tone==='emerald'?'border-emerald-100 bg-emerald-50':'border-amber-100 bg-amber-50';
  const toneIcon=tone==='red'?'bg-red-100 text-red-600':tone==='emerald'?'bg-emerald-100 text-emerald-600':'bg-amber-100 text-amber-600';
  const toneButton=tone==='red'?'bg-red-600 shadow-lg shadow-red-200 hover:bg-red-700':tone==='emerald'?'bg-emerald-600 shadow-lg shadow-emerald-200 hover:bg-emerald-700':'bg-amber-600 shadow-lg shadow-amber-200 hover:bg-amber-700';

  return (
    <Modal
      open={!!action}
      onClose={loading?()=>{}:onCancel}
      title={title}
      description={description}
    >
      <div className="space-y-5">
        <div className={'rounded-2xl border p-4 '+toneBox}>
          <div className="flex items-start gap-3">
            <div className={'grid h-10 w-10 shrink-0 place-items-center rounded-xl '+toneIcon}>
              {isDelete?<Trash2 size={19}/>:isArchive?<Archive size={19}/>:isSignout?<LogOut size={19}/>:isPaid?<CheckCircle2 size={19}/>:<AlertTriangle size={19}/>}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {isDelete && <>Delete <span className="font-bold">{action.billNumber}</span></>}
                {isArchive && <>Archive <span className="font-bold">{action.vendorName}</span></>}
                {isSignout && <>Are you sure you want to sign out?</>}
                {isPaid && <>Mark <span className="font-bold">{action.billNumber}</span> as paid?</>}
                {action.type==='payment'&&!isPaid && <>Move <span className="font-bold">{action.billNumber}</span> back to pending?</>}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {isDelete
                  ? 'The bill record will be permanently removed from your account.'
                  : isArchive
                    ? 'You can preserve your accounting history while hiding this vendor from the active vendor list.'
                    : isSignout
                      ? 'Any unsaved changes on this page will be lost.'
                      : isPaid
                        ? 'Please confirm that this vendor payment has been completed.'
                        : 'Please confirm that this payment should be reopened as pending.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-muted inline-flex items-center justify-center gap-2" onClick={onCancel} disabled={loading}>
            <X size={16}/> Cancel
          </button>
          <button
            type="button"
            className={'btn inline-flex items-center justify-center gap-2 text-white '+toneButton}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading&&<span className="spinner border-white border-r-transparent"/>}
            {loading
              ? 'Processing…'
              : isDelete
                ? 'Yes, delete bill'
                : isArchive
                  ? 'Yes, archive vendor'
                  : isSignout
                    ? 'Yes, sign out'
                    : isPaid
                      ? 'Yes, mark paid'
                      : 'Yes, mark pending'}
          </button>
        </div>
      </div>
    </Modal>
  );
}