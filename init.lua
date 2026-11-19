-- ULVim: a Neovim distribution on plain Neovim 0.12 (vim.pack, no distro underneath).
-- Every behavior here has a headless probe in tests/; CHECKS.md lists them.
vim.loader.enable()

-- Fix TERM mismatch with tmux: when running inside tmux, set TERM to match
-- tmux's default-terminal to avoid checkhealth errors about color mismatches.
if vim.env.TMUX then
    -- Check tmux's runtime default-terminal (it's often tmux-256color in WSL)
    -- Use tmux-256color to match the default-terminal that tmux uses at runtime
    vim.env.TERM = "tmux-256color"
else
    vim.env.TERM = "xterm-256color"
end

require("ulvim.options")
require("ulvim.plugins")
require("ulvim.keymaps")
require("ulvim.autocmds")
require("ulvim.commands")
-- Your own layer, if lua/user/ exists (see lua/ulvim/user.lua). Loaded last.
require("ulvim.user").setup()
