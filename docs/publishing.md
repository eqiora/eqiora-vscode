# Publishing

## Release to GitHub and Visual Studio Marketplace

The Marketplace publisher is `eqiora`; the extension ID is `eqiora.eqiora`.

1. Update the version in `package.json` and `package-lock.json`, and the changelog.
2. Merge the change after CI passes.
3. Run **Release** on protected `main` in GitHub Actions.

Release builds and tests native packages on Linux x64, Windows x64 and macOS
Apple Silicon using the exact server revision in `upstream.json`. It publishes
those packages and their SHA-256 checksums to GitHub Releases, then uploads the
same tested artifacts to Marketplace. Publishing uses the `publishing`
environment, which permits protected branches only.

The Marketplace job verifies checksums and packaged publisher, name and version.
Authentication or upload failures fail the workflow. A GitHub release alone does
not mean Marketplace publication succeeded. After fixing a publication failure,
use **Re-run failed jobs** on the original Release run. Already uploaded versions
for an individual platform are skipped; missing platforms are still published.

## One-time Marketplace authentication

### Personal Access Token (currently supported)

With the Microsoft account that manages the `eqiora` publisher:

1. Sign in to Azure DevOps and create an organization if needed.
2. Open **User settings → Personal access tokens → New Token**.
3. Select **All accessible organizations** and the custom scope
   **Marketplace → Manage** (under **Show all scopes**).
4. Store the token in this repository's **Settings → Environments → publishing →
   Environment secrets**, with the name `VSCE_PAT`.

Do not put the token in repository files or release inputs. Publication defaults
to this authentication method. Global Azure DevOps PATs retire on December 1,
2026; migrate authentication before that date and renew any earlier-expiring token.

### Trusted publishing (when available for the publisher)

The pinned `vsce` supports GitHub Actions OIDC. Once Marketplace allows a trusted
publishing policy for this publisher, authorize these exact values:

- Repository owner: `eqiora`
- Repository: `eqiora-vscode`
- Workflow: `.github/workflows/release.yml` (`release.yml` if the form asks only
  for a filename)
- Environment: `publishing`
- Branch/ref, if supported: `refs/heads/main`

Then set the `publishing` environment variable `MARKETPLACE_AUTH` to `oidc`.
The job uses `vsce publish --oidc` with `id-token: write`; it does not fall back
to a PAT after an OIDC error. Remove `VSCE_PAT` after successful OIDC publication.
CLI support does not establish that the Marketplace policy UI is available to
this publisher. If it is unavailable, follow Microsoft's supported Entra ID
publishing setup before PAT retirement.

## Open VSX

Open VSX publication remains separate. Create the Eclipse account, accept the
publisher agreement, register the `eqiora` namespace and configure `OVSX_PAT` in
the `publishing` environment. Run **Publish Open VSX** with a tested GitHub release
tag. Namespace registration does not automatically establish verified ownership.

- [VS Code publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce trusted publishing](https://github.com/microsoft/vscode-vsce#trusted-publishing)
- [Open VSX publishing guide](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions)
