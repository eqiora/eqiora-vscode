"""Regenerate canonical fixtures using Python Eqiora built at upstream.json's pin.

Run with that installed package, then npm run test:editor with the matching server.
The real editor gate rejects stale generations, foreign Models and wrong Plans.
"""
from pathlib import Path
import eqiora

root = Path(__file__).resolve().parents[1] / "test" / "fixtures"
module = eqiora.Module.parse("response", (root / "response.eqi").read_text(), package="editor.workspace")
model = eqiora.compile(source=module, entry="Response")
plan = eqiora.resolve(model, solve=eqiora.solve.Linear(
    relative_tolerance=1e-13, absolute_tolerance=1e-15, maximum_iterations=8,
    algorithm=eqiora.solve.LinearSolver.BiConjugateGradientStabilized,
    preconditioner=eqiora.solve.Preconditioner.Identity,
    reduction=eqiora.solve.Reduction.Reproducible,
    provider=eqiora.solve.SolverProvider.reference()))
result = eqiora.run(plan, state=eqiora.State.initial(plan))
plan.write(root / "response.eqplan")
result.write(root / "response.eqresult")
