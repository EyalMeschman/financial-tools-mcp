"""Core financial tools package.

This package contains stable, production-ready modules.
Proto/experimental modules are isolated under src.proto.
"""

from typing import TYPE_CHECKING

# Only import proto modules during type checking to avoid heavy dependencies
if TYPE_CHECKING:
    from . import proto

__all__ = []