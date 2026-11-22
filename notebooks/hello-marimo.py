import marimo

app = marimo.App()


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _(mo):
    n = mo.ui.slider(1, 20, value=5, label="n")
    n
    return (n,)


@app.cell
def _(mo, n):
    mo.md(f"The sum of squares up to {n.value} is **{sum(i * i for i in range(1, n.value + 1))}**.")
    return


if __name__ == "__main__":
    app.run()
