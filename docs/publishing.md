# Publishing

## GitHub releases

CI builds and tests the extension with the exact server source in `upstream.json`
on each supported OS, then uploads the VSIX. Use the **Release** workflow from
protected `main` to publish those tested packages and their SHA-256 checksums.
The version comes from `package.json`; the tag identifies the same source commit.

## Visual Studio Marketplace

Create a Marketplace publisher and ensure `package.json` uses its identifier.
Publisher registration and authentication are account-owner setup. The initial
`nkiyohara` identifier is a packaging choice, not a claim that it has been registered.

A release VSIX can be uploaded through the Marketplace publisher management page.
For automation, use the official Microsoft Entra ID authentication flow with
`vsce publish --azure-credential`. Azure DevOps global PATs are scheduled for
retirement on December 1, 2026; do not build a new permanent dependency on them.
The optional **Publish registries** workflow accepts an already configured
`VSCE_PAT` while that method is supported, and `OVSX_PAT` for Open VSX. Both are
GitHub environment secrets, never repository files.

## Open VSX

Create the Eclipse account, accept the publisher agreement, register the namespace
matching `publisher`, and configure publication credentials. Namespace registration
does not automatically establish verified ownership.

Publication is separate from package construction. Missing credentials cause an
explicit workflow failure, not a successful-looking skipped publication.

- [VS Code publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Open VSX publishing guide](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions)
