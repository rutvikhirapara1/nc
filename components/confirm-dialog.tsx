'use client';

import {AlertTriangle, CheckCircle2, Trash2, X} from 'lucide-react';
import Modal from './modal';

type ConfirmAction =
  | {type:'payment'; billNumber:string; nextStatus:'paid'|'pending'}
  | {type:'delete'; billNumber:string}
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

  return (
    <Modal
      open={!!action}
      onClose={loading?()=>{}:onCancel}
      title={isDelete?'Delete bill?':isPaid?'Mark bill as paid?':'Move bill back to pending?'}
      description={
        isDelete
          ? 'This action cannot be undone.'
          : isPaid
            ? 'This will record today as the payment date.'
            : 'The bill will become pending again and the paid date will be cleared.'
      }
    >
      <div className="space-y-5">
        <div className={'rounded-2xl border p-4 '+(
          isDelete
            ? 'border-red-100 bg-red-50'
            : isPaid
              ? 'border-emerald-100 bg-emerald-50'
              : 'border-amber-100 bg-amber-50'
        )}>
          <div className="flex items-start gap-3">
            <div className={'grid h-10 w-10 shrink-0 place-items-center rounded-xl '+
              (isDelete?'bg-red-100 text-red-600':isPaid?'bg-emerald-100 text-emerald-600':'bg-amber-100 text-amber-600')
            }>
              {isDelete?<Trash2 size={19}/>:isPaid?<CheckCircle2 size={19}/>:<AlertTriangle size={19}/>}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {isDelete?'Delete ':isPaid?'Mark as paid: ':'Mark as pending: '}
                <span className="font-bold">{action.billNumber}</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {isDelete
                  ? 'The bill record will be permanently removed from your account.'
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
            className={'btn inline-flex items-center justify-center gap-2 text-white '+
              (isDelete
                ? 'bg-red-600 shadow-lg shadow-red-200 hover:bg-red-700'
                : isPaid
                  ? 'bg-emerald-600 shadow-lg shadow-emerald-200 hover:bg-emerald-700'
                  : 'bg-amber-600 shadow-lg shadow-amber-200 hover:bg-amber-700')
            }
            onClick={onConfirm}
            disabled={loading}
          >
            {loading&&<span className="spinner border-white border-r-transparent"/>}
            {loading?'Processing…':isDelete?'Yes, delete bill':isPaid?'Yes, mark paid':'Yes, mark pending'}
          </button>
        </div>
      </div>
    </Modal>
  );
}