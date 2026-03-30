import {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  Trash2,
  ExternalLink,
  Ban,
  Layers,
  Circle,
  X,
  Truck,
  Activity,
  ArrowLeft,
} from "lucide-react";

const smoothEase = [0.22, 1, 0.36, 1];

const getParentStepIdx = (steps, currentIdx) => {
  if (currentIdx <= 0) return -1;
  const currentStep = steps[currentIdx];
  const sourceMatch = currentStep.step_name.match(/\((.*?)\)\s*$/);

  if (sourceMatch) {
    const sourceName = sourceMatch[1].trim();
    for (let i = currentIdx - 1; i >= 0; i--) {
      if (steps[i].step_name.includes(`(${sourceName})`)) {
        return i;
      }
    }
  }
  return currentIdx - 1;
};

const ProductionExecution = ({ prodId, onActionComplete, onRefreshList }) => {
  const navigate = useNavigate();
  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState(0);
  const trackRefs = useRef({});

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const fetchProductionDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/production/${prodId}`);
      const data = res.data.data;
      const flatDbSteps = Array.isArray(data.steps) ? data.steps : [];
      const map = new Map();
      const groupedPhases = [];

      flatDbSteps.forEach((step, flatIndex) => {
        const match = step.step_name.match(/^(.*?)\s*\(/);
        const baseName = match ? match[1].trim() : step.step_name.trim();
        let matName = "Various Items";

        if (step.inputs && step.inputs.length > 0) {
          matName = step.inputs.map((i) => i.item_name).join(", ");
        } else {
          const matMatch = step.step_name.match(/\((.*?)\)$/);
          if (matMatch) matName = matMatch[1];
        }

        step._flatIndex = flatIndex;
        step._materialName = matName;

        if (!map.has(baseName)) {
          const newGroup = {
            phase_name: baseName,
            steps: [],
            status: "PLANNED",
          };
          map.set(baseName, newGroup);
          groupedPhases.push(newGroup);
        }
        map.get(baseName).steps.push(step);
      });

      groupedPhases.forEach((g) => {
        const allCompleted = g.steps.every((s) => s.status === "COMPLETED");
        const anyInProgress = g.steps.some(
          (s) => s.status === "IN_PROGRESS" || s.status === "COMPLETED",
        );
        g.status = allCompleted
          ? "COMPLETED"
          : anyInProgress
            ? "IN_PROGRESS"
            : "PLANNED";
      });

      setProduction({ ...data, phases: groupedPhases, flatSteps: flatDbSteps });

      if (groupedPhases.length > 0) {
        let targetIdx = groupedPhases.findIndex(
          (g) => g.status !== "COMPLETED",
        );
        if (targetIdx === -1) targetIdx = groupedPhases.length - 1;
        setSelectedPhaseIdx(targetIdx);
      } else {
        setSelectedPhaseIdx(-1);
      }
    } catch (err) {
      toast.error("Failed to load production details.");
      onActionComplete();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (prodId) fetchProductionDetails();
  }, [prodId]);

  const handleGlobalPhaseExecute = async () => {
    const selectedPhase = production.phases[selectedPhaseIdx];
    const payloads = [];
    let hasError = false;

    selectedPhase.steps.forEach((step) => {
      if (step.status === "COMPLETED" || step.worker_mode === "CONTRACTOR")
        return;

      const res = trackRefs.current[step.id]?.getPayload();
      if (res === null) hasError = true;
      else if (res && !res.skip) payloads.push(res);
    });

    if (hasError) return;

    if (payloads.length === 0) {
      return toast.error("Please enter quantities for at least one item.");
    }

    setExecuting(true);
    try {
      for (const p of payloads) {
        await api.post(
          `/production/${prodId}/steps/${p.stepId}/post`,
          p.payload,
        );
      }
      toast.success("Progress saved successfully!");
      fetchProductionDetails();
      if (onRefreshList) onRefreshList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save progress.");
    } finally {
      setExecuting(false);
    }
  };

  const handleInlineExecuteStep = async (stepData) => {
    setExecuting(true);
    try {
      await api.post(
        `/production/${prodId}/steps/${stepData.stepId}/post`,
        stepData.payload,
      );
      toast.success("Step saved successfully!");
      fetchProductionDetails();
      if (onRefreshList) onRefreshList();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save progress.");
    } finally {
      setExecuting(false);
    }
  };

  const handleCancelBatch = async () => {
    if (
      !window.confirm(
        "Cancel this batch? Items you've already produced will be kept in your inventory.",
      )
    )
      return;

    try {
      await api.delete(`/production/${prodId}`);
      toast.success("Batch cancelled successfully.");
      onActionComplete();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel batch.");
    }
  };

  const handleHardDeleteBatch = async () => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this batch? All history will be erased.",
      )
    )
      return;

    try {
      await api.delete(`/production/${prodId}/hard`);
      toast.success("Batch deleted permanently.");
      onActionComplete();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete batch.");
    }
  };

  if (loading || !production) {
    return createPortal(
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm h-[100dvh] w-screen">
        <div className="p-5 bg-white backdrop-blur-3xl rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-slate-200/80 flex flex-col items-center gap-3">
          <Loader2
            size={28}
            className="animate-spin text-blue-500"
            strokeWidth={1.5}
          />
        </div>
      </div>,
      document.body,
    );
  }

  const phases = production.phases || [];
  const flatSteps = production.flatSteps || [];
  const selectedPhase = phases[selectedPhaseIdx];

  if (!selectedPhase) return null;

  const progressWidth =
    phases.length > 1
      ? (phases.filter((p) => p.status === "COMPLETED").length /
          (phases.length - 1)) *
        100
      : phases.filter((p) => p.status === "COMPLETED").length === 1
        ? 100
        : 0;

  const hasExecutableTracks = selectedPhase.steps.some((step) => {
    if (step.status === "COMPLETED" || step.worker_mode === "CONTRACTOR")
      return false;

    const pIdx = getParentStepIdx(flatSteps, step._flatIndex);
    if (pIdx === -1) return true;

    const pStep = flatSteps[pIdx];
    return (
      pStep.status === "COMPLETED" || Number(pStep.yielded_so_far || 0) > 0
    );
  });

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-white antialiased font-sans h-[100dvh] w-screen overflow-hidden selection:bg-blue-500 selection:text-white">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 shrink-0 z-20 border-b border-slate-100/80 bg-white/95 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() =>
              onActionComplete ? onActionComplete() : navigate(-1)
            }
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full transition-colors border border-slate-200/60 shadow-sm shrink-0"
            title="Go Back"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>

          <div className="flex flex-col min-w-0">
            <h2 className="text-[20px] sm:text-[24px] lg:text-[26px] font-bold text-slate-900 tracking-tight leading-none mb-1.5 truncate">
              {production.batch_no}
            </h2>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${production.status === "COMPLETED" ? "bg-emerald-500" : production.status === "CANCELLED" ? "bg-rose-500" : "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"}`}
              />
              {production.status.replace("_", " ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {production.status !== "COMPLETED" &&
            production.status !== "CANCELLED" && (
              <button
                onClick={handleCancelBatch}
                className="flex-1 sm:flex-none justify-center text-[10px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 px-4 py-2.5 rounded-[10px] uppercase tracking-widest transition-colors shadow-sm flex items-center gap-1"
              >
                Cancel Batch
              </button>
            )}
          <button
            onClick={handleHardDeleteBatch}
            className="flex-1 sm:flex-none justify-center text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-4 py-2.5 rounded-[10px] uppercase tracking-widest transition-colors shadow-sm flex items-center gap-1"
          >
            <Trash2 size={12} strokeWidth={2} /> Delete Permanently
          </button>
        </div>
      </div>
      <div className="w-full px-3 sm:px-6 py-4 sm:py-5 shrink-0 relative flex items-center justify-center overflow-x-auto [&::-webkit-scrollbar]:hidden border-b border-slate-50">
        <div className="relative flex items-center w-full max-w-[1400px] mx-auto h-[32px]">
          <div className="absolute left-[10px] right-[10px] top-1/2 -translate-y-1/2 h-[2px] bg-slate-100 rounded-full z-0" />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressWidth}%` }}
            transition={{ duration: 0.6, ease: smoothEase }}
            className="absolute top-1/2 left-[10px] h-[2px] bg-slate-900 rounded-full z-0 -translate-y-1/2"
            style={{ maxWidth: "calc(100% - 20px)" }}
          />

          <div className="absolute inset-0 flex justify-between items-center z-10 w-full px-[10px]">
            {phases.map((phase, idx) => {
              const isCompleted = phase.status === "COMPLETED";
              const isAccessible = phase.steps.some((step) => {
                const pIdx = getParentStepIdx(flatSteps, step._flatIndex);
                if (pIdx === -1) return true;
                const pStep = flatSteps[pIdx];
                return (
                  pStep.status === "COMPLETED" ||
                  Number(pStep.yielded_so_far || 0) > 0
                );
              });
              const isSelected = selectedPhaseIdx === idx;

              return (
                <div key={idx} className="relative flex flex-col items-center">
                  <motion.button
                    whileTap={isAccessible ? { scale: 0.9 } : {}}
                    onClick={() => {
                      if (isAccessible || isCompleted) setSelectedPhaseIdx(idx);
                    }}
                    className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 outline-none z-10 shadow-[0_0_0_4px_white] ${
                      isCompleted
                        ? "bg-slate-900 text-white cursor-pointer"
                        : isSelected
                          ? "bg-blue-600 ring-[4px] ring-blue-50 text-white cursor-pointer shadow-md"
                          : isAccessible
                            ? "bg-white border-2 border-slate-300 text-slate-300 hover:border-slate-400 cursor-pointer"
                            : "bg-white border-2 border-slate-100 text-slate-200 cursor-not-allowed"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={12} strokeWidth={3} />
                    ) : !isAccessible ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    ) : isSelected ? (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    ) : null}
                  </motion.button>

                  <div
                    className={`absolute top-8 whitespace-nowrap text-[9px] font-bold uppercase tracking-widest transition-colors ${
                      isSelected
                        ? "text-slate-900"
                        : isCompleted
                          ? "text-slate-500"
                          : "text-slate-300"
                    }`}
                  >
                    {phase.phase_name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-5 bg-slate-50/40 [&::-webkit-scrollbar]:hidden flex flex-col relative w-full">
        {production.status === "CANCELLED" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center pb-20">
            <Ban size={32} strokeWidth={1.5} className="text-slate-300 mb-4" />
            <h2 className="text-[20px] font-semibold tracking-tight text-slate-900">
              Batch Cancelled
            </h2>
            <p className="text-slate-500 font-medium mt-1 text-[13px]">
              This batch has been cancelled. Previously produced items are saved
              in your inventory.
            </p>
          </div>
        ) : (
          <div className="w-full mx-auto flex flex-col flex-1 pb-8 sm:pb-12 relative max-w-[1600px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedPhaseIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: smoothEase }}
                className="space-y-3 sm:space-y-4 flex flex-col flex-1"
              >
                {selectedPhase.steps.map((step) => {
                  const parentIdx = getParentStepIdx(
                    flatSteps,
                    step._flatIndex,
                  );
                  const pStep = parentIdx !== -1 ? flatSteps[parentIdx] : null;

                  const isLocked =
                    pStep &&
                    pStep.status !== "COMPLETED" &&
                    Number(pStep.yielded_so_far || 0) <= 0;

                  return (
                    <div
                      key={step.id}
                      className="bg-white rounded-[16px] sm:rounded-[20px] shadow-sm border border-slate-200/60 p-3 sm:p-5 relative overflow-hidden flex flex-col w-full transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4 border-b border-slate-100/80 pb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                            <Layers size={14} className="text-slate-500" />
                          </div>
                          <h3 className="font-semibold text-slate-900 text-[14px] sm:text-[15px] lg:text-[16px] tracking-tight truncate">
                            Track: {step._materialName}
                          </h3>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-200/60 px-2.5 py-1.5 rounded-[6px] shrink-0 self-start sm:self-auto">
                          {step.machine_name}
                        </span>
                      </div>

                      {isLocked ? (
                        <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-slate-400 bg-slate-50/50 rounded-[12px] border border-slate-100 border-dashed">
                          <Lock
                            size={24}
                            strokeWidth={1.5}
                            className="mb-2 opacity-40 text-slate-400"
                          />
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                            Step Locked
                          </p>
                          <p className="text-[12px] sm:text-[13px] font-medium mt-1 text-slate-400">
                            Complete the previous step to unlock this sequence.
                          </p>
                        </div>
                      ) : step.status === "COMPLETED" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                          <div className="p-4 sm:p-5 rounded-[12px] border border-slate-100 bg-slate-50/50">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                              Materials Used
                            </p>
                            <p className="text-[24px] lg:text-[28px] font-bold text-slate-800 tracking-tight tabular-nums leading-none">
                              {step.consumed_so_far}{" "}
                              <span className="text-[12px] lg:text-[13px] font-semibold text-slate-500">
                                {step.inputs?.[0]?.uom || "KG"}
                              </span>
                            </p>
                          </div>
                          <div className="p-4 sm:p-5 rounded-[12px] border border-emerald-100/60 bg-emerald-50/30">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">
                              Items Produced
                            </p>
                            <div className="space-y-2">
                              {Array.isArray(step.outputs) &&
                                step.outputs.map((out, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-2.5"
                                  >
                                    <p className="text-[16px] lg:text-[18px] font-bold text-emerald-900 tracking-tight tabular-nums leading-none shrink-0">
                                      {out.produced_qty || out.quantity}{" "}
                                      <span className="text-[10px] text-emerald-600/80 uppercase">
                                        {out.uom}
                                      </span>
                                    </p>
                                    <p className="text-[12px] lg:text-[13px] font-semibold text-emerald-800/80 truncate">
                                      {out.product_name ||
                                        out.semi_finished_name ||
                                        out.item_name}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <TrackExecutionBlock
                          ref={(el) => (trackRefs.current[step.id] = el)}
                          selectedStep={step}
                          flatSteps={flatSteps}
                          prod={production}
                          onExecuteInline={handleInlineExecuteStep}
                          executing={executing}
                          navigate={navigate}
                        />
                      )}
                    </div>
                  );
                })}

                {hasExecutableTracks && (
                  <div className="pt-3 pb-2 sticky bottom-2 z-20">
                    <button
                      onClick={handleGlobalPhaseExecute}
                      disabled={executing}
                      className="w-full h-[48px] sm:h-[52px] bg-slate-900 text-white rounded-[14px] sm:rounded-full font-bold text-[12px] sm:text-[13px] uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-slate-800 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.12)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mx-auto max-w-[400px]"
                    >
                      {executing ? (
                        <Loader2
                          className="animate-spin"
                          size={18}
                          strokeWidth={2.5}
                        />
                      ) : (
                        "Save Progress"
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

const TrackExecutionBlock = forwardRef(
  (
    { prod, selectedStep, flatSteps, onExecuteInline, executing, navigate },
    ref,
  ) => {
    const [products, setProducts] = useState([]);
    const [semiFinished, setSemiFinished] = useState([]);
    const [actualInputs, setActualInputs] = useState([]);
    const [hasScrap, setHasScrap] = useState(false);
    const [scrapQty, setScrapQty] = useState("");
    const [outputs, setOutputs] = useState([]);
    const [isFinalExecution, setIsFinalExecution] = useState(false);

    const pIdx = flatSteps
      ? getParentStepIdx(flatSteps, selectedStep._flatIndex)
      : -1;

    const isFirstPhase = pIdx === -1;
    let parentStep = null;

    if (!isFirstPhase && flatSteps && flatSteps[pIdx]) {
      parentStep = flatSteps[pIdx];
    }

    const initialMapping = useMemo(() => {
      let explicitInputs = [];

      if (selectedStep.inputs && selectedStep.inputs.length > 0) {
        explicitInputs = selectedStep.inputs.map((inp) => ({
          ...inp,
          planned_qty: Number(inp.planned_qty || inp.quantity || 0),
          consumed_qty: Number(inp.consumed_qty || 0),
        }));
      }

      let parentOutputsAsInputs = [];

      if (
        !isFirstPhase &&
        parentStep &&
        parentStep.outputs &&
        parentStep.outputs.length > 0
      ) {
        parentOutputsAsInputs = parentStep.outputs.map((out, outIdx) => {
          const actualYieldFromParent = Number(
            out.produced_qty || out.yielded_qty || out.actual_qty || 0,
          );

          let consumedSoFarForThisItem = 0;
          let mappedSemiFinishedId =
            out.semi_finished_id || out.product_id || out.item_id;

          if (explicitInputs.length > 0) {
            let matchedInpIdx = explicitInputs.findIndex(
              (i) =>
                (out.semi_finished_id &&
                  i.semi_finished_id === out.semi_finished_id) ||
                (out.product_id && i.product_id === out.product_id) ||
                (out.item_name &&
                  i.item_name &&
                  i.item_name.toLowerCase() ===
                    (out.item_name || "").toLowerCase()),
            );

            if (matchedInpIdx === -1 && explicitInputs[outIdx]) {
              matchedInpIdx = outIdx;
            }

            if (matchedInpIdx !== -1) {
              const matchedInp = explicitInputs[matchedInpIdx];
              consumedSoFarForThisItem = Number(matchedInp.consumed_qty || 0);
            }
          }

          return {
            input_item_kind:
              out.output_item_kind ||
              (out.product_id ? "FINISHED" : "SEMI_FINISHED"),
            raw_material_id: null,
            semi_finished_id: mappedSemiFinishedId,
            item_name:
              out.semi_finished_name ||
              out.product_name ||
              out.item_name ||
              "WIP Material",
            planned_qty: actualYieldFromParent,
            consumed_qty: consumedSoFarForThisItem,
            uom: out.uom || selectedStep.input_uom || "KG",
          };
        });
      }

      if (parentOutputsAsInputs.length === 0) {
        if (explicitInputs.length > 0) return explicitInputs;
        return [
          {
            input_item_kind: selectedStep.input_item_kind || "RAW",
            raw_material_id: selectedStep.input_raw_material_id,
            semi_finished_id: selectedStep.input_semi_finished_id,
            item_name: selectedStep.input_item_name || "Assigned Material",
            planned_qty: Number(selectedStep.input_qty || 0),
            consumed_qty: Number(selectedStep.consumed_so_far || 0),
            uom: selectedStep.input_uom || "KG",
          },
        ];
      }

      let merged = [...explicitInputs];

      parentOutputsAsInputs.forEach((pOut, idx) => {
        let existingIdx = merged.findIndex(
          (m) =>
            (m.semi_finished_id &&
              m.semi_finished_id === pOut.semi_finished_id) ||
            (m.item_name &&
              pOut.item_name &&
              m.item_name.toLowerCase() === pOut.item_name.toLowerCase()),
        );

        if (existingIdx === -1 && merged[idx]) {
          existingIdx = idx;
        }

        if (existingIdx !== -1) {
          merged[existingIdx].planned_qty = pOut.planned_qty;
          merged[existingIdx].consumed_qty = Math.max(
            merged[existingIdx].consumed_qty || 0,
            pOut.consumed_qty || 0,
          );
          merged[existingIdx].semi_finished_id = pOut.semi_finished_id;
          merged[existingIdx].item_name = pOut.item_name;
        } else {
          merged.push({ ...pOut });
        }
      });

      return merged;
    }, [selectedStep, parentStep, isFirstPhase]);

    const plannedTotal = useMemo(
      () => initialMapping.reduce((sum, m) => sum + m.planned_qty, 0),
      [initialMapping],
    );

    const consumedSoFar = Number(selectedStep?.consumed_so_far) || 0;
    const yieldedSoFar = Number(selectedStep?.yielded_so_far) || 0;
    const scrapSoFar = Number(selectedStep?.scrap_qty) || 0;
    const targetToAchieve = plannedTotal;

    const contractorSent = Number(selectedStep?.contractor_total_sent) || 0;
    const contractorPhysical =
      Number(selectedStep?.contractor_physical_returned) || 0;
    const contractorLoss = Number(selectedStep?.contractor_loss_returned) || 0;

    const totalInputAmt = actualInputs.reduce(
      (sum, inp) => sum + Number(inp.consume_qty || 0),
      0,
    );

    const totalOut = outputs.reduce(
      (sum, out) => sum + Number(out.quantity || 0),
      0,
    );

    const totalScrap = hasScrap ? Number(scrapQty || 0) : 0;
    const totalYieldThisRun = totalOut + totalScrap;

    const currentWIP = Math.max(0, consumedSoFar - yieldedSoFar - scrapSoFar);
    const maxYieldAllowed = totalInputAmt + currentWIP;

    const pendingToYield = Math.max(
      0,
      targetToAchieve - yieldedSoFar - scrapSoFar,
    );

    const projectedConsumed = consumedSoFar + totalInputAmt;
    const totalProjectedYield = yieldedSoFar + totalYieldThisRun + scrapSoFar;

    const parentIsCompleted = parentStep
      ? parentStep.status === "COMPLETED"
      : true;

    const isMathComplete = isFirstPhase
      ? projectedConsumed >= plannedTotal - 0.001 &&
        totalProjectedYield >= projectedConsumed - 0.001
      : parentIsCompleted &&
        projectedConsumed >= targetToAchieve - 0.001 &&
        totalProjectedYield >= projectedConsumed - 0.001;

    useEffect(() => {
      setIsFinalExecution(isMathComplete);
    }, [isMathComplete]);

    useImperativeHandle(ref, () => ({
      getPayload: () => {
        if (totalInputAmt <= 0 && totalOut <= 0 && totalScrap <= 0)
          return { skip: true };

        for (const inp of actualInputs) {
          if (Number(inp.consume_qty) > inp.max_available + 0.001) {
            toast.error(
              `You cannot use more ${inp.item_name} than what is available (${inp.max_available.toFixed(2)}).`,
            );
            return null;
          }
        }

        if (!isFirstPhase && outputs.length > 1) {
          for (let i = 0; i < outputs.length; i++) {
            const out = outputs[i];
            const outVal = Number(out.quantity || 0);

            let matchedInpIdx = actualInputs.findIndex(
              (inp) =>
                (out.item_id && out.item_id === inp.semi_finished_id) ||
                (out.item_name && out.item_name === inp.item_name),
            );
            if (matchedInpIdx === -1 && actualInputs[i]) matchedInpIdx = i;

            const matchedInp =
              matchedInpIdx !== -1 ? actualInputs[matchedInpIdx] : null;

            if (matchedInp) {
              const itemWip = Math.max(
                0,
                Number(matchedInp.consumed_so_far || 0) -
                  Number(out.produced_qty || 0),
              );
              const currentConsumed = Number(matchedInp.consume_qty || 0);
              const maxForThis = currentConsumed + itemWip;

              if (outVal > maxForThis + 0.001) {
                toast.error(
                  `Output for ${out.item_name} (${outVal}) is too high. You only have ${maxForThis.toFixed(2)} available.`,
                );
                return null;
              }
            }
          }
        } else {
          if (totalYieldThisRun > maxYieldAllowed + 0.001) {
            toast.error(
              `Total output and scrap (${totalYieldThisRun.toFixed(
                2,
              )}) cannot be more than the material used (${maxYieldAllowed.toFixed(
                2,
              )}).`,
            );
            return null;
          }
        }

        if (
          totalOut > 0 &&
          outputs.some((o) => o.quantity === "" || Number(o.quantity) < 0)
        ) {
          toast.error(
            `Please enter valid quantities for all items you are producing.`,
          );
          return null;
        }

        return {
          stepId: selectedStep.id,
          payload: {
            actual_inputs: actualInputs.map((inp) => ({
              input_item_kind: inp.input_item_kind,
              raw_material_id: inp.raw_material_id || null,
              semi_finished_id: inp.semi_finished_id || null,
              quantity: Number(inp.consume_qty || 0),
              uom: inp.uom,
            })),
            scrap_qty: totalScrap,
            is_step_complete: isFinalExecution,
            outputs: outputs.map((o) => ({
              output_item_kind: selectedStep.is_final_step
                ? "FINISHED"
                : "SEMI_FINISHED",
              product_id: selectedStep.is_final_step ? Number(o.item_id) : null,
              semi_finished_id: selectedStep.is_final_step
                ? null
                : Number(o.item_id),
              quantity: Number(o.quantity),
              uom: o.uom || "KG",
            })),
          },
        };
      },
    }));

    useEffect(() => {
      if (!selectedStep) return;

      const finalMapping = initialMapping.map((m) => {
        const itemConsumedSoFar = Number(m.consumed_qty || 0);
        const maxAvail = Math.max(0, m.planned_qty - itemConsumedSoFar);

        return {
          ...m,
          max_available: maxAvail,
          consumed_so_far: itemConsumedSoFar,
          consume_qty: "",
        };
      });

      setActualInputs(finalMapping);
      setHasScrap(false);
      setScrapQty("");
    }, [selectedStep?.id, consumedSoFar, initialMapping, plannedTotal]);

    useEffect(() => {
      const parseData = (responseData) => {
        if (!responseData) return [];
        if (Array.isArray(responseData)) return responseData;
        if (responseData.data && Array.isArray(responseData.data))
          return responseData.data;
        if (
          responseData.data &&
          responseData.data.data &&
          Array.isArray(responseData.data.data)
        )
          return responseData.data.data;
        return [];
      };

      api
        .get("/products")
        .then((r) => setProducts(parseData(r.data)))
        .catch((err) => {
          console.error("Products fetch error:", err);
          setProducts([]);
        });

      api
        .get("/products/semi-finished")
        .then((r) => setSemiFinished(parseData(r.data)))
        .catch((err) => {
          console.error("Semi-finished fetch error:", err);
          setSemiFinished([]);
        });
    }, []);

    useEffect(() => {
      if (!selectedStep) return;

      let initialOutputs = [];
      const stepOutputs = Array.isArray(selectedStep.outputs)
        ? selectedStep.outputs
        : [];

      if (stepOutputs.length > 0) {
        const seen = new Set();

        stepOutputs.forEach((o) => {
          const id = selectedStep.is_final_step
            ? o.product_id || o.item_id
            : o.semi_finished_id || o.item_id;

          const name = selectedStep.is_final_step
            ? o.product_name || o.item_name
            : o.semi_finished_name || o.item_name;

          if (id && !seen.has(id)) {
            seen.add(id);

            const planned = Number(
              o.planned_qty || o.target_qty || o.quantity || 0,
            );
            const produced = Number(
              o.produced_qty || o.yielded_qty || o.actual_qty || 0,
            );
            const pending = Math.max(0, planned - produced);

            initialOutputs.push({
              item_id: id,
              item_name: name,
              planned_qty: planned,
              produced_qty: produced,
              pending_target: pending,
              quantity: "",
              uom: o.uom || "KG",
            });
          }
        });
      }

      if (initialOutputs.length === 0) {
        initialOutputs.push({
          item_id: "",
          item_name: "Expected Goal",
          planned_qty: 0,
          produced_qty: 0,
          pending_target: 0,
          quantity: "",
          uom: "KG",
        });
      }
      setOutputs(initialOutputs);
    }, [selectedStep?.id, selectedStep?.outputs, selectedStep?.is_final_step]);

    const getProductName = (id) => {
      if (!id) return "";
      if (selectedStep.is_final_step) {
        const safeProducts = Array.isArray(products) ? products : [];
        return (
          safeProducts.find((p) => p.id === Number(id))?.product_name ||
          "Unknown Product"
        );
      }
      const safeSemiFinished = Array.isArray(semiFinished) ? semiFinished : [];
      return (
        safeSemiFinished.find((s) => s.id === Number(id))?.item_name ||
        "Unknown Target"
      );
    };

    if (selectedStep.worker_mode === "CONTRACTOR") {
      const unSent = Math.max(0, targetToAchieve - contractorSent);
      const pendingReturn = Math.max(
        0,
        contractorSent - contractorPhysical - contractorLoss,
      );
      const isAwaitingReturn = pendingReturn > 0.001;
      const assignedContractorId = selectedStep.workers?.[0]?.id || "";

      const handleCreateDispatch = () => {
        const itemIds = [];
        const qtys = [];

        actualInputs.forEach((inp) => {
          const id =
            inp.raw_material_id ||
            inp.semi_finished_id ||
            inp.input_raw_material_id ||
            inp.input_semi_finished_id;

          if (id && Number(inp.max_available) > 0) {
            itemIds.push(id);
            qtys.push(inp.max_available);
          }
        });

        const params = new URLSearchParams({
          action: "new_job",
          source_step_id: selectedStep.id,
          production_order_id: prod.id,
          item_id: itemIds.join(","),
          qty: qtys.join(","),
          contractor_id: assignedContractorId,
        });

        navigate(`/contractor?${params.toString()}`);
      };

      return (
        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-slate-50 border border-slate-200/60 rounded-[12px] p-3 flex flex-col justify-center items-center text-center shadow-sm">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">
                Expected Output
              </p>
              <p className="text-[18px] lg:text-[20px] font-black text-slate-800 tracking-tight tabular-nums leading-none">
                {targetToAchieve.toFixed(2)}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100/80 rounded-[12px] p-3 flex flex-col justify-center items-center text-center shadow-sm">
              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1 truncate">
                Sent to Vendor
              </p>
              <p className="text-[18px] lg:text-[20px] font-black text-blue-900 tracking-tight tabular-nums leading-none">
                {contractorSent.toFixed(2)}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100/80 rounded-[12px] p-3 flex flex-col justify-center items-center text-center shadow-sm">
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1 truncate">
                Received Back
              </p>
              <p className="text-[18px] lg:text-[20px] font-black text-emerald-900 tracking-tight tabular-nums leading-none">
                {contractorPhysical.toFixed(2)}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100/80 rounded-[12px] p-3 flex flex-col justify-center items-center text-center shadow-sm">
              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1 truncate">
                Pending Return
              </p>
              <p className="text-[18px] lg:text-[20px] font-black text-amber-900 tracking-tight tabular-nums leading-none">
                {pendingReturn.toFixed(2)}
              </p>
            </div>
          </div>

          {unSent > 0.001 ? (
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-[12px] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 mt-2">
              <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  <Truck size={16} className="text-slate-600" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] sm:text-[14px] font-bold text-slate-800 truncate">
                    Ready to Send
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 truncate">
                    {unSent.toFixed(2)} KG ready to be sent to the vendor.
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateDispatch}
                className="w-full sm:w-auto h-[40px] px-5 bg-slate-900 text-white font-bold uppercase tracking-widest text-[10px] sm:text-[11px] rounded-[10px] hover:bg-slate-800 flex justify-center items-center gap-2 shadow-md shrink-0 whitespace-nowrap"
              >
                Send to Vendor <ExternalLink size={14} strokeWidth={2} />
              </motion.button>
            </div>
          ) : isAwaitingReturn ? (
            <div className="bg-amber-50/50 border border-amber-200/60 p-3 sm:p-4 rounded-[12px] shadow-sm flex items-center gap-3 mt-2">
              <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                <Loader2
                  className="animate-spin text-amber-600"
                  size={16}
                  strokeWidth={2.5}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] sm:text-[14px] font-bold text-amber-900 truncate">
                  At Vendor
                </p>
                <p className="text-[11px] sm:text-[12px] font-medium text-amber-700/80 leading-tight mt-0.5">
                  Vendor currently has {pendingReturn.toFixed(2)} KG. The next
                  steps will unlock as materials are received back.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/50 border border-emerald-200/60 p-3 sm:p-4 rounded-[12px] shadow-sm flex items-center gap-3 mt-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2
                  className="text-emerald-600"
                  size={18}
                  strokeWidth={2.5}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] sm:text-[14px] font-bold text-emerald-900 truncate">
                  Vendor Task Completed
                </p>
                <p className="text-[11px] sm:text-[12px] font-medium text-emerald-700/80 leading-tight mt-0.5">
                  All materials sent to the vendor have been received back.
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    const balanceDiff = totalInputAmt - totalYieldThisRun;
    const isBalanced = totalInputAmt > 0 && Math.abs(balanceDiff) < 0.001;

    return (
      <div className="space-y-4 lg:space-y-5">
        <div className="flex justify-between items-center text-[10px] lg:text-[11px] font-bold uppercase tracking-widest bg-slate-50/80 px-3 py-2 rounded-[8px]">
          <span className="text-slate-500 flex items-center gap-1.5">
            Total Produced: {yieldedSoFar.toFixed(2)}
            {scrapSoFar > 0 && (
              <span className="text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-[4px] border border-rose-100/60 lowercase font-medium tracking-normal">
                + {scrapSoFar.toFixed(2)} scrap
              </span>
            )}
          </span>
          <span className="text-slate-400">
            Left to Produce: {pendingToYield.toFixed(2)}
          </span>
        </div>

        {!isFirstPhase &&
          outputs.length > 1 &&
          actualInputs.some((inp) => Number(inp.consumed_so_far) > 0) && (
            <div className="bg-slate-100/50 border border-slate-200/60 rounded-[14px] p-3 lg:p-4">
              <div className="flex items-center gap-2 mb-2 lg:mb-3">
                <Activity size={14} className="text-slate-400" />
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Materials Available for this Step (WIP)
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {actualInputs.map((inp, originalIdx) => {
                  if (Number(inp.consumed_so_far) <= 0) return null;

                  let outIdx = outputs.findIndex(
                    (o) =>
                      (o.item_id && o.item_id === inp.semi_finished_id) ||
                      (o.item_name &&
                        inp.item_name &&
                        o.item_name.toLowerCase() ===
                          inp.item_name.toLowerCase()),
                  );
                  if (outIdx === -1 && outputs[originalIdx])
                    outIdx = originalIdx;

                  const out = outIdx !== -1 ? outputs[outIdx] : null;
                  const prodSoFar = out ? Number(out.produced_qty || 0) : 0;
                  const wip = Math.max(
                    0,
                    Number(inp.consumed_so_far) - prodSoFar,
                  );

                  return (
                    <div
                      key={originalIdx}
                      className="px-3 py-2.5 bg-white border border-slate-200/80 rounded-[10px] flex items-center justify-between shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex flex-col min-w-0 pr-3">
                        <span className="text-[11px] lg:text-[12px] font-bold text-slate-800 truncate">
                          {inp.item_name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          From Previous Step:{" "}
                          {Number(inp.consumed_so_far).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span
                          className={`text-[14px] lg:text-[15px] font-black tracking-tight tabular-nums leading-none ${wip > 0 ? "text-amber-600" : "text-emerald-600"}`}
                        >
                          {wip > 0 ? wip.toFixed(2) : "0.00"}
                        </span>
                        <span className="text-[8px] lg:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {wip > 0 ? "Left to Produce" : "Completed"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2 px-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                1. Materials Used
              </label>
            </div>

            <div className="flex flex-col gap-2">
              {actualInputs.map((inp, idx) => {
                const isZeroStock = inp.max_available <= 0;

                return (
                  <div
                    key={idx}
                    className={`p-3 sm:p-4 rounded-[14px] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${isZeroStock ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-slate-50/50"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[12px] lg:text-[13px] font-semibold truncate mb-0.5 ${isZeroStock ? "text-emerald-800" : "text-slate-800"}`}
                      >
                        {inp.item_name}
                      </p>
                      <span
                        className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${isZeroStock ? "text-emerald-600" : "text-slate-400"}`}
                      >
                        Available: {inp.max_available.toFixed(2)} {inp.uom}
                      </span>
                    </div>

                    {isZeroStock ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[18px] lg:text-[20px] font-bold text-emerald-600 tracking-tight tabular-nums">
                          0.00
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600/70 ml-0.5 uppercase">
                          {inp.uom}
                        </span>
                        <div className="px-2 py-1 bg-emerald-100/50 text-emerald-700 rounded-[6px] ml-2 flex items-center gap-1 border border-emerald-200/50">
                          <Lock size={10} strokeWidth={3} />
                          <span className="text-[8px] lg:text-[9px] tracking-widest font-bold">
                            LOCKED
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center w-full sm:w-[140px] lg:w-[160px] border-b-2 border-slate-200 focus-within:border-blue-500 transition-colors pb-0.5 shrink-0">
                        <input
                          type="number"
                          value={inp.consume_qty}
                          onChange={(e) => {
                            let val = e.target.value;

                            if (val !== "") {
                              const maxAvail = Number(inp.max_available);
                              if (Number(val) < 0) val = "0";
                              else if (Number(val) > maxAvail) {
                                val =
                                  maxAvail > 0
                                    ? parseFloat(maxAvail.toFixed(3)).toString()
                                    : "0";
                                toast.error(
                                  `Output reduced. Only ${val} of material is available.`,
                                  { id: `input-cap-${idx}` },
                                );
                              }
                            }

                            const newInputs = [...actualInputs];
                            newInputs[idx].consume_qty = val;
                            setActualInputs(newInputs);
                          }}
                          placeholder="0.00"
                          className="w-full font-bold text-[18px] lg:text-[20px] bg-transparent outline-none tracking-tight tabular-nums placeholder:text-slate-300 text-slate-900"
                        />
                        <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 ml-1.5 shrink-0">
                          {inp.uom}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-1">
            {consumedSoFar > 0 && (isFirstPhase || outputs.length === 1) && (
              <div className="mb-3 px-3 py-3 bg-slate-100/50 border border-slate-200/60 rounded-[12px] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                    Total Materials Used
                  </span>
                  <span className="text-[13px] lg:text-[14px] font-black text-slate-800 tracking-tight tabular-nums">
                    {consumedSoFar.toFixed(2)}{" "}
                    <span className="text-[9px]">KG</span>
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${currentWIP > 0 ? "text-amber-600" : "text-emerald-600"}`}
                  >
                    Work In Progress (WIP)
                  </span>
                  <span
                    className={`text-[13px] lg:text-[14px] font-black tracking-tight tabular-nums ${currentWIP > 0 ? "text-amber-700" : "text-emerald-700"}`}
                  >
                    {currentWIP.toFixed(2)}{" "}
                    <span className="text-[9px]">KG</span>
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-2 px-1 mt-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                2. Items Produced
              </label>

              {totalInputAmt > 0 && (isFirstPhase || outputs.length === 1) && (
                <span
                  className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${isBalanced ? "text-emerald-500" : totalYieldThisRun > maxYieldAllowed + 0.001 ? "text-rose-500" : "text-slate-500"}`}
                >
                  {isBalanced ? (
                    <>
                      <Check size={12} strokeWidth={3} /> Balanced
                    </>
                  ) : balanceDiff > 0 ? (
                    <>
                      <Circle
                        size={10}
                        strokeWidth={2.5}
                        className="text-amber-500"
                      />{" "}
                      {balanceDiff.toFixed(2)} unused
                    </>
                  ) : totalYieldThisRun > maxYieldAllowed + 0.001 ? (
                    <>
                      <Ban
                        size={10}
                        strokeWidth={2.5}
                        className="text-rose-500"
                      />{" "}
                      Too much output
                    </>
                  ) : (
                    <>
                      <Circle
                        size={10}
                        strokeWidth={2.5}
                        className="text-purple-500"
                      />{" "}
                      {Math.abs(balanceDiff).toFixed(2)} Produced from WIP
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {outputs.map((out, idx) => {
                let strictMaxForThis = 0;
                let isStrictMapped = false;
                if (!isFirstPhase && outputs.length > 1) {
                  let matchedInpIdx = actualInputs.findIndex(
                    (inp) =>
                      (out.item_id && out.item_id === inp.semi_finished_id) ||
                      (out.item_name &&
                        inp.item_name &&
                        out.item_name.toLowerCase() ===
                          inp.item_name.toLowerCase()),
                  );
                  if (matchedInpIdx === -1 && actualInputs[idx])
                    matchedInpIdx = idx;

                  const matchedInp =
                    matchedInpIdx !== -1 ? actualInputs[matchedInpIdx] : null;

                  if (matchedInp) {
                    const itemWip = Math.max(
                      0,
                      Number(matchedInp.consumed_so_far || 0) -
                        Number(out.produced_qty || 0),
                    );
                    const currentConsumed = Number(matchedInp.consume_qty || 0);
                    strictMaxForThis = currentConsumed + itemWip;
                    isStrictMapped = true;
                  }
                }
                if (!isStrictMapped) {
                  const currentOut = Number(out.quantity || 0);
                  const othersTotal = totalOut - currentOut;
                  strictMaxForThis = Math.max(
                    0,
                    maxYieldAllowed - totalScrap - othersTotal,
                  );
                }

                return (
                  <div
                    key={idx}
                    className="flex flex-col md:flex-row gap-3 items-stretch md:items-center"
                  >
                    <div className="flex-[2] min-w-0">
                      <div className="w-full flex items-center bg-slate-50 border border-slate-200/80 shadow-sm px-3 py-3 rounded-[12px]">
                        <CheckCircle2
                          size={16}
                          className="text-emerald-500 mr-2 shrink-0"
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[12px] lg:text-[13px] font-bold text-slate-800 truncate">
                            {out.item_name || getProductName(out.item_id)}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400">
                              Target: {out.planned_qty.toFixed(2)} {out.uom}
                            </span>
                            {out.pending_target > 0 ? (
                              <span className="text-[9px] uppercase tracking-widest font-bold text-amber-500">
                                Pending: {out.pending_target.toFixed(2)}{" "}
                                {out.uom}
                              </span>
                            ) : (
                              <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-500">
                                Goal Reached
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right bg-white border border-slate-200/60 px-2 py-1 rounded-[6px] ml-2">
                          <span className="block text-[8px] font-bold uppercase tracking-widest text-blue-500">
                            {isFirstPhase || outputs.length === 1
                              ? "Available Pool"
                              : "Max Allowed"}
                          </span>
                          <span className="block text-[11px] lg:text-[12px] font-black tabular-nums text-slate-800">
                            {strictMaxForThis.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center border-b-2 border-slate-200 focus-within:border-blue-500 transition-colors pb-0.5 shrink-0 min-w-[100px]">
                      <input
                        type="number"
                        value={out.quantity}
                        onChange={(e) => {
                          let val = e.target.value;

                          if (val !== "") {
                            if (Number(val) < 0) val = "0";
                            else if (Number(val) > strictMaxForThis + 0.001) {
                              val =
                                strictMaxForThis > 0
                                  ? parseFloat(
                                      strictMaxForThis.toFixed(3),
                                    ).toString()
                                  : "0";
                              toast.error(
                                `Output reduced. Only ${val}kg of material is available.`,
                                { id: `out-cap-${idx}` },
                              );
                            }
                          }

                          const newOuts = [...outputs];
                          newOuts[idx].quantity = val;
                          setOutputs(newOuts);
                        }}
                        placeholder="0.00"
                        className="w-full font-bold text-[18px] lg:text-[20px] bg-transparent outline-none tracking-tight tabular-nums placeholder:text-slate-300 text-slate-900"
                      />
                      <span className="text-[9px] lg:text-[10px] font-bold text-slate-400 ml-1.5 uppercase shrink-0">
                        {out.uom || "KG"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {!hasScrap ? (
                <button
                  type="button"
                  onClick={() => setHasScrap(true)}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors self-start flex items-center gap-1.5"
                >
                  <span className="text-[14px] leading-none">+</span> Add Scrap
                  / Waste
                </button>
              ) : (
                <div className="p-3 sm:p-4 bg-rose-50/50 border border-rose-100/80 rounded-[12px] flex flex-col md:flex-row gap-3 items-stretch md:items-center mt-2">
                  <div className="flex-[2] min-w-0 flex justify-between items-center bg-white border border-rose-200/60 shadow-[0_2px_8px_rgba(225,29,72,0.02)] px-3 py-3 rounded-[12px]">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <Trash2 size={16} className="text-rose-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] lg:text-[13px] font-bold text-rose-800 truncate">
                          Scrap / Waste
                        </span>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-rose-400 truncate">
                          Lost Material
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setHasScrap(false);
                        setScrapQty("");
                      }}
                      className="text-rose-300 hover:text-rose-500 shrink-0 transition-colors p-1"
                    >
                      <X size={16} strokeWidth={2.5} />
                    </button>
                  </div>

                  <div className="flex-1 flex items-center border-b-2 border-rose-200 focus-within:border-rose-500 transition-colors pb-0.5 shrink-0 min-w-[100px]">
                    <input
                      type="number"
                      value={scrapQty}
                      onChange={(e) => {
                        let val = e.target.value;

                        if (val !== "") {
                          const totalAvailableOverall = actualInputs.reduce(
                            (sum, inp, i) => {
                              const out = outputs[i];
                              const prodSoFar = out
                                ? Number(out.produced_qty || 0)
                                : 0;
                              const itemWip = Math.max(
                                0,
                                Number(inp.consumed_so_far) - prodSoFar,
                              );
                              return (
                                sum + Number(inp.consume_qty || 0) + itemWip
                              );
                            },
                            0,
                          );

                          const maxForScrap = Math.max(
                            0,
                            totalAvailableOverall - totalOut,
                          );

                          if (Number(val) < 0) val = "0";
                          else if (Number(val) > maxForScrap + 0.001) {
                            val =
                              maxForScrap > 0
                                ? parseFloat(maxForScrap.toFixed(3)).toString()
                                : "0";
                            toast.error(
                              `Output reduced. Only ${val}kg of material is available.`,
                            );
                          }
                        }

                        setScrapQty(val);
                      }}
                      placeholder="0.00"
                      className="w-full font-bold text-[18px] lg:text-[20px] bg-transparent outline-none tracking-tight tabular-nums placeholder:text-rose-300 text-rose-900"
                    />
                    <span className="text-[9px] lg:text-[10px] font-bold text-rose-500 ml-1.5 uppercase shrink-0">
                      KG
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100 flex flex-col gap-3">
            <div className="flex flex-col bg-slate-50/80 border border-slate-200/60 p-1.5 rounded-[12px]">
              <div className="flex items-center w-full relative">
                <button
                  type="button"
                  disabled={isMathComplete}
                  onClick={() => setIsFinalExecution(false)}
                  className={`flex-1 px-3 py-2.5 text-[10px] lg:text-[11px] font-bold tracking-widest uppercase transition-all duration-300 rounded-[8px] flex items-center justify-center gap-1.5 z-10 ${
                    !isFinalExecution
                      ? "bg-white text-blue-600 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                      : "text-slate-500 hover:text-slate-800"
                  } ${isMathComplete ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {isMathComplete ? (
                    <Lock size={12} strokeWidth={2.5} />
                  ) : (
                    <Circle size={12} strokeWidth={2.5} />
                  )}{" "}
                  Save Partial Progress
                </button>

                <button
                  type="button"
                  disabled={!isMathComplete}
                  onClick={() => setIsFinalExecution(true)}
                  className={`flex-1 px-3 py-2.5 text-[10px] lg:text-[11px] font-bold tracking-widest uppercase transition-all duration-300 rounded-[8px] flex items-center justify-center gap-1.5 z-10 ${
                    isFinalExecution
                      ? "bg-white text-emerald-600 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-emerald-500/20"
                      : "text-slate-500 hover:text-slate-800"
                  } ${!isMathComplete ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {!isMathComplete ? (
                    <Lock size={12} strokeWidth={2.5} />
                  ) : (
                    <Check size={12} strokeWidth={3} />
                  )}{" "}
                  Mark Step Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export default ProductionExecution;
