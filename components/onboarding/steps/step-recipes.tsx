"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useOnboarding, type Recipe } from "@/lib/onboarding-context"

interface StepProps {
  onValidChange: (valid: boolean) => void
}

export default function StepRecipes({ onValidChange }: StepProps) {
  const { data, addRecipe, removeRecipe } = useOnboarding()
  const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({
    item: "",
    ingredient: "",
    unitsPerItem: undefined,
  })

  useEffect(() => {
    // Recipes are optional
    onValidChange(true)
  }, [onValidChange])

  const handleAddRecipe = () => {
    if (newRecipe.item && newRecipe.ingredient && newRecipe.unitsPerItem) {
      addRecipe(newRecipe as Recipe)
      setNewRecipe({ item: "", ingredient: "", unitsPerItem: undefined })
    }
  }

  const isFormComplete = newRecipe.item && newRecipe.ingredient && newRecipe.unitsPerItem

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Map menu items to their ingredients to forecast ingredient quantities. This helps with prep planning.
      </p>

      {/* Add New Recipe */}
      <div className="space-y-4 rounded-2xl border bg-card p-4">
        <Label className="text-base font-medium">Add Recipe Mapping</Label>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Menu Item</Label>
            <Input
              placeholder="e.g., Croissant"
              value={newRecipe.item}
              onChange={(e) => setNewRecipe({ ...newRecipe, item: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ingredient</Label>
            <Input
              placeholder="e.g., Butter"
              value={newRecipe.ingredient}
              onChange={(e) => setNewRecipe({ ...newRecipe, ingredient: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Units per Item</Label>
            <Input
              type="number"
              placeholder="e.g., 50"
              value={newRecipe.unitsPerItem || ""}
              onChange={(e) => setNewRecipe({ ...newRecipe, unitsPerItem: Number(e.target.value) })}
            />
          </div>
        </div>

        <Button type="button" onClick={handleAddRecipe} disabled={!isFormComplete} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add Recipe
        </Button>
      </div>

      {/* Recipe List */}
      {data.recipes.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-medium">Recipe Mappings ({data.recipes.length})</Label>
          <div className="rounded-xl border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Item</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Ingredient</th>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground">Units</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.recipes.map((recipe, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="p-3 text-sm text-secondary">{recipe.item}</td>
                    <td className="p-3 text-sm text-secondary">{recipe.ingredient}</td>
                    <td className="p-3 text-sm text-secondary">{recipe.unitsPerItem}</td>
                    <td className="p-3">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRecipe(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
